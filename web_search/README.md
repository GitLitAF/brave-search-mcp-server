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

**IMPORTANT**: This tool matches Claude's native `web_search_20250305` architecture. Configuration is set **at initialization** (via environment variables), NOT per tool call.

Create a `.env` file:

```env
# Required
BRAVE_API_KEY=your_brave_search_api_key_here

# Optional: Tool configuration (set once at startup)
WEB_SEARCH_MAX_USES=5
WEB_SEARCH_MAX_RESULTS=5
WEB_SEARCH_ALLOWED_DOMAINS=example.com,trusteddomain.org
WEB_SEARCH_BLOCKED_DOMAINS=untrustedsource.com
WEB_SEARCH_LOCATION_CITY=San Francisco
WEB_SEARCH_LOCATION_REGION=California
WEB_SEARCH_LOCATION_COUNTRY=US
WEB_SEARCH_LOCATION_TIMEZONE=America/Los_Angeles
```

Get your Brave Search API key from: https://brave.com/search/api/

## Usage

### As a standalone MCP server

```bash
npm run build
node dist/index.js
```

### Tool Input (Matching Native Tool)

The `web_search` tool accepts **only a query parameter** per call, just like Claude's native tool:

```json
{
  "name": "web_search",
  "arguments": {
    "query": "latest developments in quantum computing 2025"
  }
}
```

### Configuration Parameters

Configuration is set at **server initialization** via environment variables:

| Environment Variable | Description | Example |
|---------------------|-------------|---------|
| `BRAVE_API_KEY` | **Required** - Brave Search API key | `BSA...` |
| `WEB_SEARCH_MAX_USES` | Max searches per session | `5` |
| `WEB_SEARCH_ALLOWED_DOMAINS` | Comma-separated domain whitelist | `arxiv.org,nature.com` |
| `WEB_SEARCH_BLOCKED_DOMAINS` | Comma-separated domain blacklist | `spam.com` |
| `WEB_SEARCH_MAX_RESULTS` | Max results to return | `5` |
| `WEB_SEARCH_LOCATION_*` | User location (city, region, country, timezone) | See above |

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

## Architecture Comparison

### Native Tool (`web_search_20250305`)
```json
// Configuration in API request
"tools": [{
  "type": "web_search_20250305",
  "name": "web_search",
  "max_uses": 5,
  "allowed_domains": ["example.com"],
  "blocked_domains": ["spam.com"]
}]

// Tool call (just query)
{
  "name": "web_search",
  "input": { "query": "search terms" }
}
```

### This MCP Server
```bash
# Configuration via environment
export WEB_SEARCH_MAX_USES=5
export WEB_SEARCH_ALLOWED_DOMAINS=example.com
export WEB_SEARCH_BLOCKED_DOMAINS=spam.com
node dist/index.js
```

```json
// Tool call (just query)
{
  "name": "web_search",
  "arguments": { "query": "search terms" }
}
```

**✅ Identical usage pattern**: Configuration at initialization, query-only tool calls

## Feature Comparison

| Feature | Native web_search_20250305 | This MCP Server |
|---------|---------------------------|-----------------|
| **Architecture** | Config in API request | Config via env vars |
| **Tool Input** | `{ query }` only ✓ | `{ query }` only ✓ |
| Search Provider | Brave Search | Brave Search ✓ |
| Content Fetching | Built-in | HTML→Markdown ✓ |
| Citations | Automatic | Extracted ✓ |
| Domain Filtering | Yes ✓ | Yes ✓ |
| Localization | Yes ✓ | Yes ✓ |
| Encrypted Content | AES encryption | Base64 encoding* |
| Usage Tracking | Server-side | Per-session ✓ |
| Pricing | $10/1000 searches | API key costs |

*Note: Base64 encoding instead of encryption (MCP servers don't have access to Claude's encryption keys). Functionality is identical for caching purposes.

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
