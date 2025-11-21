#!/usr/bin/env node

/**
 * Web Search MCP Server
 * Entry point - starts the server on stdio
 */

import { WebSearchServer } from './server.js';
import { WebSearchConfig } from './types.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Validate required environment variables
  if (!process.env.BRAVE_API_KEY) {
    console.error('Error: BRAVE_API_KEY environment variable is required');
    console.error('Please set it in your .env file or environment');
    process.exit(1);
  }

  // Load configuration from environment variables
  // This matches the native tool's configuration-at-initialization pattern
  const config: WebSearchConfig = {};

  if (process.env.WEB_SEARCH_MAX_USES) {
    config.max_uses = parseInt(process.env.WEB_SEARCH_MAX_USES, 10);
  }

  if (process.env.WEB_SEARCH_ALLOWED_DOMAINS) {
    config.allowed_domains = process.env.WEB_SEARCH_ALLOWED_DOMAINS.split(',').map((d) =>
      d.trim()
    );
  }

  if (process.env.WEB_SEARCH_BLOCKED_DOMAINS) {
    config.blocked_domains = process.env.WEB_SEARCH_BLOCKED_DOMAINS.split(',').map((d) =>
      d.trim()
    );
  }

  if (process.env.WEB_SEARCH_MAX_RESULTS) {
    config.max_results = parseInt(process.env.WEB_SEARCH_MAX_RESULTS, 10);
  }

  // User location from environment (if provided)
  if (
    process.env.WEB_SEARCH_LOCATION_CITY &&
    process.env.WEB_SEARCH_LOCATION_REGION &&
    process.env.WEB_SEARCH_LOCATION_COUNTRY &&
    process.env.WEB_SEARCH_LOCATION_TIMEZONE
  ) {
    config.user_location = {
      type: 'approximate',
      city: process.env.WEB_SEARCH_LOCATION_CITY,
      region: process.env.WEB_SEARCH_LOCATION_REGION,
      country: process.env.WEB_SEARCH_LOCATION_COUNTRY,
      timezone: process.env.WEB_SEARCH_LOCATION_TIMEZONE,
    };
  }

  try {
    const server = new WebSearchServer(config);
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
