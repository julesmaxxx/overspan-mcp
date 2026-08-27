#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { buildServer } from "./server.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.apiKey) {
    // Start anyway so clients and catalog checkers can list the tools; every
    // tool call explains how to get a key until one is configured.
    console.error("overspan-mcp: no OVERSPAN_API_KEY set; tools will return setup guidance until one is configured.");
  }
  const server = buildServer(cfg);
  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
