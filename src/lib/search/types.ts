export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchAdapter {
  search(query: string, maxResults?: number): Promise<SearchResult[]>;
}
