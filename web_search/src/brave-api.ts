/**
 * Brave Search API client
 */

import type { BraveSearchResponse, WebSearchParams } from './types.js';

const BRAVE_SEARCH_API_URL = 'https://api.search.brave.com/res/v1/web/search';

export class BraveSearchClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BRAVE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('BRAVE_API_KEY environment variable is required');
    }
  }

  /**
   * Execute a web search using Brave Search API
   */
  async search(params: WebSearchParams): Promise<BraveSearchResponse> {
    const url = new URL(BRAVE_SEARCH_API_URL);
    url.searchParams.set('q', params.query);
    url.searchParams.set('count', String(params.max_results || 5));

    // Add location parameters if provided
    if (params.user_location) {
      url.searchParams.set('search_lang', 'en');
      url.searchParams.set('country', params.user_location.country);
      // Note: Brave API has limited location support, we use what's available
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as BraveSearchResponse;
      return data;
    } catch (error) {
      throw new Error(
        `Failed to search Brave API: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Filter results based on domain restrictions
   */
  filterByDomains(
    results: BraveSearchResponse,
    allowedDomains?: string[],
    blockedDomains?: string[]
  ): BraveSearchResponse {
    if (!results.web?.results) return results;

    let filtered = results.web.results;

    if (allowedDomains && allowedDomains.length > 0) {
      filtered = filtered.filter((result) => {
        const url = new URL(result.url);
        return allowedDomains.some((domain) => {
          // Support subdomains and subpaths
          const domainPattern = domain.replace(/\./g, '\\.');
          const regex = new RegExp(`(^|\\.)${domainPattern}($|/)`);
          return regex.test(url.hostname + url.pathname);
        });
      });
    }

    if (blockedDomains && blockedDomains.length > 0) {
      filtered = filtered.filter((result) => {
        const url = new URL(result.url);
        return !blockedDomains.some((domain) => {
          const domainPattern = domain.replace(/\./g, '\\.');
          const regex = new RegExp(`(^|\\.)${domainPattern}($|/)`);
          return regex.test(url.hostname + url.pathname);
        });
      });
    }

    return {
      ...results,
      web: {
        ...results.web,
        results: filtered,
      },
    };
  }
}
