import { z } from 'zod';

/**
 * Web search tool parameters matching Claude's native web_search_20250305 tool
 */
export const WebSearchParamsSchema = z.object({
  query: z.string().describe('The search query to execute'),
  max_uses: z.number().optional().describe('Maximum number of searches to perform'),
  allowed_domains: z
    .array(z.string())
    .optional()
    .describe('Only include results from these domains'),
  blocked_domains: z
    .array(z.string())
    .optional()
    .describe('Never include results from these domains'),
  user_location: z
    .object({
      type: z.literal('approximate'),
      city: z.string(),
      region: z.string(),
      country: z.string(),
      timezone: z.string(),
    })
    .optional()
    .describe('Localize search results based on user location'),
  fetch_page_content: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to fetch full page content for results'),
  max_results: z
    .number()
    .optional()
    .default(5)
    .describe('Maximum number of search results to return'),
});

export type WebSearchParams = z.infer<typeof WebSearchParamsSchema>;

/**
 * Brave Search API Response Types
 */
export interface BraveSearchResult {
  url: string;
  title: string;
  description: string;
  age?: string;
  page_age?: string;
  extra_snippets?: string[];
}

export interface BraveSearchResponse {
  web?: {
    results: BraveSearchResult[];
  };
  query?: {
    original: string;
  };
}

/**
 * Web search result with content and citations
 */
export interface WebSearchResult {
  type: 'web_search_result';
  url: string;
  title: string;
  encrypted_content: string; // Base64 encoded content for caching
  page_age?: string;
  description?: string;
}

/**
 * Citation location within a search result
 */
export interface CitationLocation {
  type: 'web_search_result_location';
  url: string;
  title: string;
  encrypted_index: string; // Base64 encoded index for multi-turn conversations
  cited_text: string; // Up to 150 characters
}

/**
 * Web search tool result
 */
export interface WebSearchToolResult {
  type: 'web_search_tool_result';
  tool_use_id: string;
  content: WebSearchResult[];
}

/**
 * Fetched page content
 */
export interface FetchedContent {
  url: string;
  content: string;
  title: string;
  error?: string;
}
