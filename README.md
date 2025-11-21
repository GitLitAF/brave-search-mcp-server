# Web Search Tools Collection

A collection of MCP servers and tools for web searching and content fetching, organized as a scratch space for experimenting with search implementations.

## Repository Structure

### 📁 brave/
The original Brave Search MCP Server - provides comprehensive web search capabilities via the Brave Search API.

**Features:**
- Web search with rich results
- Image, video, and news search
- Local business search
- AI-powered summarization
- Discussion and FAQ results

See [brave/README.md](brave/README.md) for details.

### 📁 web_fetch/
The MCP Fetch Server (Python) - fetches and simplifies web content to markdown.

**Features:**
- Fetch any URL and convert HTML to markdown
- Respects robots.txt
- Content simplification using readability
- Pagination support for long content

See [web_fetch/README.md](web_fetch/README.md) for details.

### 📁 web_search/ ⭐ **NEW**
**Native Web Search Recreation** - An MCP server that recreates Claude's native `web_search_20250305` tool functionality.

**Features:**
- ✅ Brave Search API integration
- ✅ Full page content fetching (HTML → Markdown)
- ✅ Automatic citation extraction
- ✅ Domain filtering (allowed/blocked lists)
- ✅ Location-based search results
- ✅ Content caching (Base64 encoding)
- ✅ Usage limits (max_uses)
- ✅ Identical API to native tool

**Why this recreation?**

Claude's native web search tool is excellent, but it's only available through Anthropic's API at $10/1000 searches. This recreation provides the same functionality as an MCP server that:
1. You can self-host
2. Only costs your Brave API usage
3. Gives you full control over search behavior
4. Can be customized and extended

**Usage Example:**
```json
{
  "name": "web_search",
  "arguments": {
    "query": "latest quantum computing breakthroughs 2025",
    "max_results": 5,
    "fetch_page_content": true,
    "allowed_domains": ["arxiv.org", "nature.com"]
  }
}
```

See [web_search/README.md](web_search/README.md) for complete documentation.

## Comparison Matrix

| Feature | Brave MCP | Web Fetch MCP | Web Search MCP (New) | Claude Native |
|---------|-----------|---------------|---------------------|---------------|
| Search API | Brave ✓ | N/A | Brave ✓ | Brave ✓ |
| Content Fetching | Snippets only | Full HTML→MD ✓ | Full HTML→MD ✓ | Built-in ✓ |
| Citations | Manual | N/A | Auto-extracted ✓ | Auto ✓ |
| Domain Filtering | Via params | N/A | ✓ | ✓ |
| Localization | ✓ | N/A | ✓ | ✓ |
| Robots.txt | N/A | Respects ✓ | N/A* | N/A |
| Pricing | API key | Free | API key | $10/1000 |

*Web Search MCP doesn't check robots.txt since it's designed for research/citation use

## Getting Started

### 1. Web Search MCP (Recommended)

The all-in-one solution combining search + content fetching + citations:

```bash
cd web_search
npm install
npm run build

# Create .env with your Brave API key
echo "BRAVE_API_KEY=your_key" > .env

# Run
node dist/index.js
```

### 2. Brave Search MCP

For pure search API access without content fetching:

```bash
cd brave
npm install
npm run build
```

### 3. Web Fetch MCP

For standalone URL fetching (Python):

```bash
cd web_fetch
pip install -e .
python -m mcp_server_fetch
```

## Use Cases

### Research & Citations
Use **web_search/** for:
- Finding recent academic papers
- Getting cited sources automatically
- Cross-referencing information
- Building knowledge bases

### Quick Searches
Use **brave/** for:
- Fast search without content fetching
- Image/video search
- News searches
- Local business lookup

### Content Extraction
Use **web_fetch/** for:
- Extracting specific articles
- Converting documentation to markdown
- Archiving web content
- Reading paywalled content (where permitted)

## Development

Each directory is a standalone project:

```bash
# Web Search (TypeScript)
cd web_search && npm run watch

# Brave Search (TypeScript)
cd brave && npm run watch

# Web Fetch (Python)
cd web_fetch && pip install -e .
```

## API Keys

All search tools require a Brave Search API key:
- Get one at: https://brave.com/search/api/
- Free tier: 2,000 queries/month
- Paid plans available for higher usage

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  MCP Client (Claude)                 │
└─────────────────────────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           │                           │
           ▼                           ▼
┌──────────────────────┐   ┌──────────────────────┐
│   web_search MCP     │   │   brave MCP          │
│   • Search           │   │   • Search only      │
│   • Fetch content    │   │   • Fast results     │
│   • Extract citations│   │   • Multi-type       │
└──────────────────────┘   └──────────────────────┘
           │                           │
           └─────────────┬─────────────┘
                         │
                         ▼
              ┌────────────────────┐
              │   Brave Search API  │
              └────────────────────┘

           ┌──────────────────────┐
           │   web_fetch MCP      │
           │   • Fetch URLs       │
           │   • HTML→Markdown    │
           │   • Robots.txt       │
           └──────────────────────┘
```

## Contributing

This is a scratch space for experimenting with search tools. Feel free to:
- Add new search providers
- Improve content extraction
- Enhance citation formatting
- Add new features

## License

- **brave/**: MIT (Brave Software, Inc.)
- **web_fetch/**: MIT (Model Context Protocol)
- **web_search/**: MIT

## Credits

- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Powered by [Brave Search API](https://brave.com/search/api/)
- Inspired by Claude's native web search tool
- Web fetch adapted from [MCP Servers](https://github.com/modelcontextprotocol/servers)

---

**Note:** This repository serves as a scratch space for developing and testing web search tools. The `web_search/` implementation recreates Claude's native web search functionality for self-hosting and customization purposes.
