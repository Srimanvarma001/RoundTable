import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";
import { config } from "../config";
import fs from "node:fs";
import path from "node:path";

export interface GithubSignals {
  topLanguages: Array<{ lang: string; bytes: number }>;
  shipped90d: number;
  abandoned: number;
  medianAgeDays: number;
  medianCommits: number;
  topics: string[];
  readmeLines: string[];
  stars: number;
  topRepo: string;
  contributionsLastYear: number;
  rawRepos: number;
}

/** GitHub ingestion: REST repos/languages + GraphQL contributions. Cached to data/cache/github.json */
export async function ingestGithub(username?: string): Promise<{ text: string; signals: Partial<GithubSignals> }> {
  const user = username || config.githubUsername;
  if (!user) return { text: "No GITHUB_USERNAME set.", signals: {} };
  const octokit = new Octokit({ auth: config.githubToken });
  const cachePath = path.join(process.cwd(), "data", "cache", "github.json");
  try {
    const repos = await octokit.paginate(octokit.repos.listForUser, {
      username: user,
      per_page: 100,
    });
    const mine = repos.filter((r) => !r.fork).slice(0, 300);
    const langBytes = new Map<string, number>();
    const now = Date.now();
    const ninety = 90 * 86400_000;
    const year = 365 * 86400_000;
    let shipped = 0;
    let abandoned = 0;
    const topics: string[] = [];
    const readmeLines: string[] = [];
    let stars = 0;
    let topRepo = "";
    let topStars = -1;
    for (const r of mine.slice(0, 60)) {
      try {
        const langs = (await octokit.repos.listLanguages({ owner: user, repo: r.name })).data as Record<string, number>;
        for (const [k, v] of Object.entries(langs)) langBytes.set(k, (langBytes.get(k) ?? 0) + v);
      } catch { /* ignore */ }
      const pushed = r.pushed_at ? new Date(r.pushed_at).getTime() : 0;
      const created = r.created_at ? new Date(r.created_at).getTime() : now;
      void created;
      if (now - pushed < ninety) shipped++;
      if (r.description && now - pushed > year) abandoned++;
      stars += r.stargazers_count ?? 0;
      if ((r.stargazers_count ?? 0) > topStars) {
        topStars = r.stargazers_count ?? 0;
        topRepo = r.full_name;
      }
      topics.push(...(r.topics ?? []));
      if (r.description) readmeLines.push(`${r.name}: ${r.description}`);
    }
    const topLanguages = [...langBytes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang, bytes]) => ({ lang, bytes }));
    let contributionsLastYear = 0;
    if (config.githubToken) {
      try {
        const gql = graphql.defaults({ headers: { authorization: `bearer ${config.githubToken}` } });
        const data = (await gql(
          `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions}}}}`,
          { login: user },
        )) as { user: { contributionsCollection: { contributionCalendar: { totalContributions: number } } } };
        contributionsLastYear = data.user.contributionsCollection.contributionCalendar.totalContributions;
      } catch { /* ignore */ }
    }
    const signals: GithubSignals = {
      topLanguages, shipped90d: shipped, abandoned,
      medianAgeDays: 0, medianCommits: 0, topics: [...new Set(topics)].slice(0, 30),
      readmeLines: readmeLines.slice(0, 40), stars, topRepo,
      contributionsLastYear, rawRepos: mine.length,
    };
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify({ at: Date.now(), signals }, null, 2));
    const text = [
      `GitHub user ${user}: ${mine.length} non-fork repos.`,
      `Top languages: ${topLanguages.map((l) => `${l.lang} (${l.bytes}b)`).join(", ")}.`,
      `Shipped (commit ≤90d): ${shipped}. Abandoned (desc, ≥5 commits implied, no commit 12mo): ${abandoned}.`,
      `Stars total ${stars}, top ${topRepo}. Contributions last year: ${contributionsLastYear}.`,
      `Topics: ${signals.topics.join(", ")}.`,
      `Repos: ${readmeLines.join(" | ").slice(0, 3000)}`,
    ].join("\n");
    return { text, signals };
  } catch (e) {
    return { text: `GitHub fetch failed: ${(e as Error).message}`, signals: {} };
  }
}
