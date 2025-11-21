import { z } from 'zod';

/**
 * Tool configuration - set at initialization, not per-call
 * Matches Claude's native web_search_20250305 architecture
 */
export const WebSearchConfigSchema = z.object({
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
  max_results: z.number().optional().describe('Maximum number of search results to return'),
});

export type WebSearchConfig = z.infer<typeof WebSearchConfigSchema>;

/**
 * Tool input - only query parameter, matching native tool
 */
export const WebSearchInputSchema = z.object({
  query: z.string().describe('The search query to execute'),
});

export type WebSearchInput = z.infer<typeof WebSearchInputSchema>;

/**
 * Internal search parameters combining config and input
 */
export interface WebSearchParams {
  query: string;
  max_uses?: number;
  allowed_domains?: string[];
  blocked_domains?: string[];
  user_location?: {
    type: 'approximate';
    city: string;
    region: string;
    country: string;
    timezone: string;
  };
  max_results?: number;
}

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
