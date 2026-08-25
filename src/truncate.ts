interface OverpassJson {
  elements?: unknown[];
  [key: string]: unknown;
}

export function shapeResponse(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  try {
    const parsed = JSON.parse(text) as OverpassJson;
    if (Array.isArray(parsed.elements) && parsed.elements.length > 1) {
      const total = parsed.elements.length;
      let keep = Math.max(1, Math.floor((total * maxChars) / text.length));
      while (keep > 1) {
        const candidate: OverpassJson = {
          ...parsed,
          elements: parsed.elements.slice(0, keep),
          overspan_mcp_truncated: `Showing ${keep} of ${total} elements. The full response was ${text.length} characters. Narrow the query (smaller area, tighter filters, lower limit) or use count_features first.`,
        };
        const out = JSON.stringify(candidate);
        if (out.length <= maxChars) return out;
        keep = Math.floor(keep / 2);
      }
    }
  } catch {
    // Not JSON; fall through to plain truncation.
  }
  return (
    text.slice(0, maxChars) +
    `\n[truncated: the full response was ${text.length} characters. Narrow the query, or raise OVERSPAN_MAX_RESPONSE_CHARS.]`
  );
}
