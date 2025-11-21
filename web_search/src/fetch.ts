/**
 * Web fetching functionality adapted from MCP fetch server
 * Converts HTML to markdown for LLM consumption
 */

import TurndownService from 'turndown';
import { parse } from 'node-html-parser';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

/**
 * Extract and simplify HTML content to markdown
 */
export function extractContentFromHtml(html: string): string {
  try {
    const root = parse(html);

    // Remove script and style elements
    root.querySelectorAll('script, style, nav, footer, header').forEach((el) => el.remove());

    // Try to find main content area
    const mainContent =
      root.querySelector('main') ||
      root.querySelector('article') ||
      root.querySelector('[role="main"]') ||
      root.querySelector('.content') ||
      root.querySelector('#content') ||
      root;

    const htmlContent = mainContent.innerHTML;
    const markdown = turndownService.turndown(htmlContent);

    return markdown;
  } catch (error) {
    return `<error>Failed to parse HTML: ${error}</error>`;
  }
}

/**
 * Fetch URL and return markdown content
 */
export async function fetchUrl(
  url: string,
  userAgent: string = 'ModelContextProtocol/1.0 (WebSearch; +https://github.com/anthropics/web-search-mcp)'
): Promise<{ content: string; title: string; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      return {
        content: '',
        title: '',
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();
    const root = parse(html);

    // Extract title
    const titleEl = root.querySelector('title');
    const title = titleEl ? titleEl.text : '';

    // Convert to markdown
    const content = extractContentFromHtml(html);

    return { content, title };
  } catch (error) {
    return {
      content: '',
      title: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract citations from content
 * Returns array of text snippets (up to 150 chars each)
 */
export function extractCitations(content: string, maxCitations: number = 5): string[] {
  const citations: string[] = [];
  const paragraphs = content.split('\n\n');

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed.length > 20) {
      // Skip very short paragraphs
      const citation = trimmed.substring(0, 150);
      citations.push(citation);
      if (citations.length >= maxCitations) break;
    }
  }

  return citations;
}
