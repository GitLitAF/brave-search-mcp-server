#!/usr/bin/env node

/**
 * Web Search MCP Server
 * Entry point - starts the server on stdio
 */

import { WebSearchServer } from './server.js';
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

  try {
    const server = new WebSearchServer();
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
