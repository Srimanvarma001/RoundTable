import { config } from "../config";
import type { SearchAdapter, SearchResult } from "./types";

/** Real Tavily calls for the Trend-Watcher. Interface abstracted so provider can swap. */
export class TavilyAdapter implements SearchAdapter {
  async search(query: string, maxResults = 5): Promise<SearchResult[]> {
    const key = config.tavilyApiKey;
    if (!key) throw new Error("Missing TAVILY_API_KEY");
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query, max_results: maxResults, search_depth: "advanced" }),
    });
    if (!res.ok) throw new Error(`Tavily ${res.status}`);
    const data = (await res.json()) as { results?: Array<{ title: string; url: string; content: string }> };
    return (data.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.content }));
  }
}
