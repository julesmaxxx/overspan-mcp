import type { Config } from "./config.js";
import { ERROR_HINTS } from "./hints.js";
import { VERSION } from "./version.js";

export interface QuotaInfo {
  limit?: string;
  remaining?: string;
  reset?: string;
}

export interface ApiResult {
  ok: boolean;
  status: number;
  text: string;
  quota: QuotaInfo;
  retryAfter?: string;
}

const USER_AGENT = `overspan-mcp/${VERSION}`;

function quotaFrom(headers: Headers): QuotaInfo {
  const quota: QuotaInfo = {};
  const limit = headers.get("x-overspan-quota-limit");
  const remaining = headers.get("x-overspan-quota-remaining");
  const reset = headers.get("x-overspan-quota-reset");
  if (limit) quota.limit = limit;
  if (remaining) quota.remaining = remaining;
  if (reset) quota.reset = reset;
  return quota;
}

async function toResult(res: Response): Promise<ApiResult> {
  return {
    ok: res.ok,
    status: res.status,
    text: await res.text(),
    quota: quotaFrom(res.headers),
    retryAfter: res.headers.get("retry-after") ?? undefined,
  };
}

export async function runQuery(cfg: Config, ql: string): Promise<ApiResult> {
  const res = await fetch(`${cfg.apiUrl}/api/interpreter`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: `data=${encodeURIComponent(ql)}`,
  });
  return toResult(res);
}

export async function getUsage(cfg: Config): Promise<ApiResult> {
  const res = await fetch(`${cfg.apiUrl}/api/usage`, {
    headers: { Authorization: `Bearer ${cfg.apiKey}`, "User-Agent": USER_AGENT },
  });
  return toResult(res);
}

export function describeError(result: ApiResult): string {
  let code = "";
  let message = "";
  try {
    const parsed = JSON.parse(result.text) as { error?: { code?: string; message?: string } };
    code = parsed.error?.code ?? "";
    message = parsed.error?.message ?? "";
  } catch {
    // Non-JSON error body; fall through to the raw text.
  }
  if (!code) {
    const raw = result.text.slice(0, 500) || "(empty body)";
    return `Overspan request failed with HTTP ${result.status}: ${raw}`;
  }
  const hint = ERROR_HINTS[code];
  const parts = [`Overspan error ${result.status} (${code}): ${message}`];
  if (hint) parts.push(hint);
  if (result.retryAfter) parts.push(`Retry-After: ${result.retryAfter} seconds.`);
  return parts.join(" ");
}

export function quotaLine(quota: QuotaInfo): string | undefined {
  if (!quota.remaining || !quota.limit) return undefined;
  const reset = quota.reset ? `, resets ${quota.reset}` : "";
  return `[quota] ${quota.remaining} of ${quota.limit} monthly requests remaining${reset}`;
}
