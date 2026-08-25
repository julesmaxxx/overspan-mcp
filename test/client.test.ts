import { afterEach, describe, expect, it, vi } from "vitest";
import { describeError, getUsage, quotaLine, runQuery } from "../src/client.js";
import type { Config } from "../src/config.js";

const cfg: Config = { apiKey: "TESTKEY", apiUrl: "https://api.example.test", maxChars: 48000 };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runQuery", () => {
  it("POSTs form-encoded QL with a Bearer header and reads quota headers", async () => {
    const fetchMock = vi.fn(async () =>
      new Response('{"elements":[]}', {
        status: 200,
        headers: {
          "X-Overspan-Quota-Limit": "50000",
          "X-Overspan-Quota-Remaining": "49999",
          "X-Overspan-Quota-Reset": "2026-09-01T00:00:00Z",
        },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await runQuery(cfg, "[out:json];node(1);out;");
    expect(result.ok).toBe(true);
    expect(result.quota).toEqual({ limit: "50000", remaining: "49999", reset: "2026-09-01T00:00:00Z" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.test/api/interpreter");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer TESTKEY");
    expect(init.body).toBe("data=" + encodeURIComponent("[out:json];node(1);out;"));
  });
});

describe("getUsage", () => {
  it("GETs /api/usage with a Bearer header", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await getUsage(cfg);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.example.test/api/usage");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer TESTKEY");
  });
});

describe("describeError", () => {
  it("names the code, keeps the gateway message, and adds the hint and Retry-After", () => {
    const text = describeError({
      ok: false,
      status: 429,
      text: '{"error":{"code":"rate_limited","message":"Too many requests."}}',
      quota: {},
      retryAfter: "12",
    });
    expect(text).toContain("429");
    expect(text).toContain("rate_limited");
    expect(text).toContain("Too many requests.");
    expect(text).toContain("slower pace");
    expect(text).toContain("Retry-After: 12 seconds");
  });

  it("covers the invalid_key path a wrong key produces", () => {
    const text = describeError({
      ok: false,
      status: 401,
      text: '{"error":{"code":"invalid_key","message":"Unknown or inactive API key."}}',
      quota: {},
    });
    expect(text).toContain("invalid_key");
    expect(text).toContain("overspan.dev");
  });

  it("falls back to the raw body for non-JSON errors", () => {
    const text = describeError({ ok: false, status: 502, text: "Bad Gateway", quota: {} });
    expect(text).toContain("502");
    expect(text).toContain("Bad Gateway");
  });
});

describe("quotaLine", () => {
  it("renders when limit and remaining are present", () => {
    expect(quotaLine({ limit: "50000", remaining: "49999", reset: "2026-09-01T00:00:00Z" })).toBe(
      "[quota] 49999 of 50000 monthly requests remaining, resets 2026-09-01T00:00:00Z"
    );
  });

  it("returns undefined without headers", () => {
    expect(quotaLine({})).toBeUndefined();
  });
});
