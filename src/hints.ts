export const ERROR_HINTS: Record<string, string> = {
  missing_key: "No API key reached the gateway. Check OVERSPAN_API_KEY in the MCP server's env block.",
  invalid_key: "The key is unknown, revoked, or not yet activated. Check it for typos; keys arrive by email after checkout at https://overspan.dev/?utm_source=overspan-mcp&utm_medium=tool#pricing, or try it free for 7 days at https://overspan.dev/trial?utm_source=overspan-mcp&utm_medium=tool",
  missing_query: "No Overpass QL reached the gateway. This is a bug in the tool, not in your query.",
  query_caps: "[timeout:] or [maxsize:] exceeds this key's tier cap. Lower the value, or upgrade the plan.",
  rate_limited: "Too many requests this minute. Wait the Retry-After period, then continue at a slower pace.",
  concurrency_limit: "Too many queries in flight for this key. Wait about a second and retry.",
  quota_exceeded: "The request quota is used up. A plan's quota resets at the start of the month (UTC); a free trial's 2,000 requests do not reset. Do not retry before then.",
  trial_ended: "This free trial has ended and its key no longer works. Do not retry. A plan comes with a new key by email: https://overspan.dev/?utm_source=overspan-mcp&utm_medium=tool#pricing",
  trial_busy: "Trial queries wait while the servers are busy with paying customers. Retry after the Retry-After period; this is not an error in the query.",
  no_backend: "No healthy database is available right now. Retry after the Retry-After period.",
  upstream_timeout: "The query did not finish in time. Make it cheaper (smaller area, tighter filters) or raise [timeout:] up to the tier cap.",
  upstream_error: "The database failed to answer. Retry with backoff.",
};
