export const ERROR_HINTS: Record<string, string> = {
  missing_key: "No API key reached the gateway. Check OVERSPAN_API_KEY in the MCP server's env block.",
  invalid_key: "The key is unknown, revoked, or not yet activated. Check it for typos; keys arrive by email after checkout at https://overspan.dev.",
  missing_query: "No Overpass QL reached the gateway. This is a bug in the tool, not in your query.",
  query_caps: "[timeout:] or [maxsize:] exceeds this key's tier cap. Lower the value, or upgrade the plan.",
  rate_limited: "Too many requests this minute. Wait the Retry-After period, then continue at a slower pace.",
  concurrency_limit: "Too many queries in flight for this key. Wait about a second and retry.",
  quota_exceeded: "The monthly request quota is used up. It resets at the start of the month (UTC). Do not retry before then.",
  no_backend: "No healthy database is available right now. Retry after the Retry-After period.",
  upstream_timeout: "The query did not finish in time. Make it cheaper (smaller area, tighter filters) or raise [timeout:] up to the tier cap.",
  upstream_error: "The database failed to answer. Retry with backoff.",
};
