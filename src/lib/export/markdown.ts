export interface ExportRun {
  seedPrompt: string;
  profileVersion?: number;
  proposals: Array<{ title: string; author: string; score: number; description: string }>;
  critiques: Array<{ author: string; target: string; stance: string; comment: string }>;
  votes: Array<{ agent: string; proposal: string; score: number; weight: number; comment: string }>;
  winner: { title: string; description: string; why: string };
  dissent: Array<{ seat: string; score: number; comment: string }>;
  metrics: Record<string, number | boolean>;
}

export function toMarkdown(e: ExportRun): string {
  const L: string[] = [];
  L.push(`# Round Table run\n\nSeed: ${e.seedPrompt}\n`);
  if (e.profileVersion !== undefined) L.push(`Profile version: ${e.profileVersion}\n`);
  L.push(`## Proposals\n`);
  for (const p of e.proposals) L.push(`- **${p.title}** by ${p.author} — ${p.score.toFixed(2)}\n  ${p.description}`);
  L.push(`\n## Critiques\n`);
  for (const c of e.critiques) L.push(`- ${c.author} [${c.stance}] on ${c.target}: ${c.comment}`);
  L.push(`\n## Votes\n`);
  L.push(`| agent | proposal | score | weight | comment |`);
  L.push(`|---|---|---|---|---|`);
  for (const v of e.votes) L.push(`| ${v.agent} | ${v.proposal} | ${v.score} | ${v.weight.toFixed(3)} | ${v.comment} |`);
  L.push(`\n## Winner: ${e.winner.title}\n\n${e.winner.description}\n\nWhy it won: ${e.winner.why}\n`);
  L.push(`## Dissent\n`);
  for (const d of e.dissent) L.push(`- ${d.seat} (${d.score}): ${d.comment}`);
  L.push(`\n## Metrics\n`);
  for (const [k, v] of Object.entries(e.metrics)) L.push(`- ${k}: ${v}`);
  return L.join("\n");
}

export function toJSON(e: ExportRun): string {
  return JSON.stringify(e, null, 2);
}
