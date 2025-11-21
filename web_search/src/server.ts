/**
 * MCP Server recreating Claude's native web search tool
 * Combines Brave Search API with web fetching and citation support
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { BraveSearchClient } from './brave-api.js';
import { fetchUrl, extractCitations } from './fetch.js';
import {
  WebSearchInputSchema,
  type WebSearchConfig,
  type WebSearchParams,
  type WebSearchResult,
} from './types.js';

export class WebSearchServer {
  private server: Server;
  private braveClient: BraveSearchClient;
  private searchCount: number = 0;
  private config: WebSearchConfig;

  constructor(config?: WebSearchConfig) {
    this.server = new Server(
      {
        name: 'web-search-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Store configuration - this is set once at initialization, like native tool
    this.config = config || {};
    this.braveClient = new BraveSearchClient();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'web_search',
            description: `Performs web searches with real-time content fetching and citations.

This tool recreates Claude's native web_search_20250305 functionality by:
- Executing web searches using Brave Search API
- Fetching full page content from top results
- Extracting and formatting citations
- Supporting domain filtering and localization

When to use:
- Finding current information beyond the knowledge cutoff
- Researching recent events or breaking news
- Getting multiple perspectives on a topic
- Verifying facts with cited sources

The tool returns results with:
- Full page content (converted to markdown)
- Citations with source URLs and titles
- Page age information
- Encrypted content for multi-turn caching

Note: Configuration (max_uses, allowed_domains, etc.) is set at server initialization.`,
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The search query to execute',
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'web_search') {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      // Parse input (only query)
      const input = WebSearchInputSchema.parse(request.params.arguments);

      // Combine with stored configuration
      const params: WebSearchParams = {
        query: input.query,
        ...this.config,
      };

      return await this.executeWebSearch(params);
    });
  }

  /**
   * Execute web search with content fetching
   */
  private async executeWebSearch(params: WebSearchParams) {
    // Check max_uses limit (from config)
    if (this.config.max_uses && this.searchCount >= this.config.max_uses) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              type: 'web_search_tool_result_error',
              error_code: 'max_uses_exceeded',
              message: `Maximum web search uses (${this.config.max_uses}) exceeded`,
            }),
          },
        ],
      };
    }

    this.searchCount++;

    try {
      // Execute search
      let searchResults = await this.braveClient.search(params);

      // Apply domain filtering (from config)
      searchResults = this.braveClient.filterByDomains(
        searchResults,
        this.config.allowed_domains,
        this.config.blocked_domains
      );

      if (!searchResults.web?.results || searchResults.web.results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                type: 'web_search_tool_result',
                content: [],
                message: 'No search results found',
              }),
            },
          ],
        };
      }

      // Fetch full content for results
      const results: WebSearchResult[] = [];
      const maxResults = Math.min(
        this.config.max_results || 5,
        searchResults.web.results.length
      );

      for (let i = 0; i < maxResults; i++) {
        const result = searchResults.web.results[i];

        let content = result.description || '';
        let title = result.title;

        // Always fetch full page content (matching native behavior)
        const fetched = await fetchUrl(result.url);
        if (!fetched.error && fetched.content) {
          content = fetched.content;
          if (fetched.title) title = fetched.title;
        }

        // Encode content for caching (simulates encryption)
        const encrypted_content = Buffer.from(content).toString('base64');

        results.push({
          type: 'web_search_result',
          url: result.url,
          title: title,
          encrypted_content: encrypted_content,
          page_age: result.age || result.page_age,
          description: result.description,
        });
      }

      // Format response matching native tool structure
      const response = {
        type: 'web_search_tool_result',
        search_query: params.query,
        results_count: results.length,
        content: results,
      };

      // Also include citations in a separate block for reference
      const citations = results.map((result) => {
        const decoded = Buffer.from(result.encrypted_content, 'base64').toString('utf-8');
        const citationSnippets = extractCitations(decoded, 3);

        return {
          url: result.url,
          title: result.title,
          citations: citationSnippets,
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: `Search Results for: "${params.query}"\n\n${JSON.stringify(response, null, 2)}`,
          },
          {
            type: 'text',
            text: `\n\nCitations:\n${JSON.stringify(citations, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              type: 'web_search_tool_result_error',
              error_code: 'unavailable',
              message: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
      };
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Web Search MCP Server running on stdio');
  }
}
