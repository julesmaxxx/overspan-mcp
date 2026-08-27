export interface Config {
  apiKey: string;
  apiUrl: string;
  maxChars: number;
}

export const MISSING_KEY_GUIDANCE =
  "OVERSPAN_API_KEY is not set. Put it in this MCP server's env block " +
  "(not your shell profile; MCP clients start servers with their own environment). " +
  "No key yet? Plans at https://overspan.dev/#pricing, the key arrives by email after checkout.";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = (env.OVERSPAN_API_KEY ?? "").trim();
  const apiUrl = (env.OVERSPAN_API_URL ?? "https://api.overspan.dev").replace(/\/+$/, "");
  const parsed = Number(env.OVERSPAN_MAX_RESPONSE_CHARS ?? 48000);
  const maxChars = Number.isFinite(parsed) && parsed >= 1000 ? Math.floor(parsed) : 48000;
  return { apiKey, apiUrl, maxChars };
}
