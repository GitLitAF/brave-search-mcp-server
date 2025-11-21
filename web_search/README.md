# Web Search MCP Server

A Model Context Protocol (MCP) server that recreates Claude's native `web_search_20250305` tool functionality using the Brave Search API and web content fetching.

## Features

This MCP server provides identical usage to Claude's native web search tool:

- **Real-time Web Search**: Executes searches using Brave Search API
- **Full Content Fetching**: Retrieves complete page content (converted to markdown)
- **Citation Support**: Extracts and formats citations from search results
- **Domain Filtering**: Supports allowed/blocked domain lists
- **Localization**: Location-based search results
- **Content Caching**: Base64-encoded content for multi-turn conversations
- **Usage Limits**: Configurable max_uses parameter

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file:

```env
BRAVE_API_KEY=your_brave_search_api_key_here
```

Get your Brave Search API key from: https://brave.com/search/api/

## Usage

### As a standalone MCP server

```bash
npm run build
node dist/index.js
```

### Tool Parameters

The `web_search` tool accepts the following parameters (matching Claude's native tool):

```typescript
{
  query: string;                    // Required: The search query
  max_uses?: number;                // Optional: Limit searches per session
  allowed_domains?: string[];       // Optional: Whitelist domains
  blocked_domains?: string[];       // Optional: Blacklist domains
  user_location?: {                 // Optional: Localize results
    type: 'approximate';
    city: string;
    region: string;
    country: string;
    timezone: string;
  };
  fetch_page_content?: boolean;     // Optional: Fetch full content (default: true)
  max_results?: number;             // Optional: Max results to return (default: 5)
}
```

### Example Tool Call

```json
{
  "name": "web_search",
  "arguments": {
    "query": "latest developments in quantum computing 2025",
    "max_results": 5,
    "fetch_page_content": true,
    "allowed_domains": ["arxiv.org", "nature.com", "science.org"]
  }
}
```

### Response Format

The tool returns results in a format similar to Claude's native web search:

```json
{
  "type": "web_search_tool_result",
  "search_query": "your query",
  "results_count": 5,
  "content": [
    {
      "type": "web_search_result",
      "url": "https://example.com",
      "title": "Page Title",
      "encrypted_content": "base64_encoded_content...",
      "page_age": "2 days ago",
      "description": "Brief description"
    }
  ]
}
```

Plus a citations block:

```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "citations": [
    "First 150 characters of relevant content...",
    "Another citation snippet...",
    "Third citation..."
  ]
}
```

## Comparison with Native Tool

| Feature | Native web_search_20250305 | This MCP Server |
|---------|---------------------------|-----------------|
| Search Provider | Brave Search | Brave Search ✓ |
| Content Fetching | Built-in | HTML→Markdown ✓ |
| Citations | Automatic | Extracted ✓ |
| Domain Filtering | Yes | Yes ✓ |
| Localization | Yes | Yes ✓ |
| Encrypted Content | AES encryption | Base64 encoding* |
| Usage Tracking | Server-side | Per-session ✓ |
| Pricing | $10/1000 searches | API key costs |

*Note: This implementation uses Base64 encoding instead of encryption since MCP servers don't have access to Claude's encryption keys. The functionality is identical for caching purposes.

## Architecture

```
web_search/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # Main MCP server implementation
│   ├── brave-api.ts      # Brave Search API client
│   ├── fetch.ts          # Web content fetching (HTML→Markdown)
│   └── types.ts          # TypeScript type definitions
├── package.json
├── tsconfig.json
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run watch

# Format code
npm run format
```

## Use Cases

- **Current Events**: Search for recent news and developments
- **Research**: Find and cite sources for factual information
- **Verification**: Cross-reference information from multiple sources
- **Discovery**: Explore topics with automatic content extraction

## Advantages over Basic Search

1. **Full Content Access**: Not just snippets, but complete page content
2. **Automatic Citations**: Pre-extracted citation snippets for easy referencing
3. **Clean Markdown**: HTML converted to readable markdown format
4. **Domain Control**: Filter results to trusted sources
5. **Caching Ready**: Encoded content for efficient multi-turn conversations

## Error Handling

The tool returns structured errors:

- `max_uses_exceeded`: Too many searches in session
- `unavailable`: Network or API errors
- `invalid_input`: Invalid parameters

## License

MIT

## Credits

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Powered by [Brave Search API](https://brave.com/search/api/)
- Inspired by Claude's native web search tool
