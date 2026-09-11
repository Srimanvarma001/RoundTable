import type { SearchAdapter, SearchResult } from "./types";

/** Canned results for offline development (SEARCH_PROVIDER=stub). */
export class StubSearchAdapter implements SearchAdapter {
  async search(query: string, maxResults = 5): Promise<SearchResult[]> {
    return Array.from({ length: maxResults }, (_, i) => ({
      title: `Stub result ${i + 1} for "${query}"`,
      url: `https://example.com/${i + 1}`,
      snippet: "Offline stub snippet. Set TAVILY_API_KEY and SEARCH_PROVIDER=tavily for live results.",
    }));
  }
}

export function getSearchAdapter(): SearchAdapter {
  // lazy import to keep config server-only
  if (process.env.SEARCH_PROVIDER === "stub") return new StubSearchAdapter();
  // default to stub when no key, so dev never hard-fails
  if (!process.env.TAVILY_API_KEY) return new StubSearchAdapter();
  const { TavilyAdapter } = require("./tavily") as typeof import("./tavily");
  return new TavilyAdapter();
}
