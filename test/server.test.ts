import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildServer } from "../src/server.js";
import type { Config } from "../src/config.js";

const cfg: Config = { apiKey: "TESTKEY", apiUrl: "https://api.example.test", maxChars: 48000 };

async function connectedClient() {
  const server = buildServer(cfg);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("overspan MCP server", () => {
  it("lists the five tools, two resources, and one prompt", async () => {
    const client = await connectedClient();
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(tools).toEqual(["count_features", "features_in_bbox", "find_nearby", "get_usage", "overpass_query"]);
    const resources = (await client.listResources()).resources.map((r) => r.uri).sort();
    expect(resources).toEqual(["overspan://differences", "overspan://overpass-ql"]);
    const prompts = (await client.listPrompts()).prompts.map((p) => p.name);
    expect(prompts).toEqual(["write-bounded-overpass-query"]);
  });

  it("runs a query end to end and appends the quota line", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response('{"elements":[{"type":"node","id":1}]}', {
          status: 200,
          headers: { "X-Overspan-Quota-Limit": "50000", "X-Overspan-Quota-Remaining": "49998" },
        })
      )
    );
    const client = await connectedClient();
    const result = await client.callTool({
      name: "find_nearby",
      arguments: { lat: -36.85, lon: 174.76, tags: { amenity: "cafe" } },
    });
    const texts = (result.content as Array<{ type: string; text: string }>).map((c) => c.text);
    expect(texts[0]).toContain('"elements"');
    expect(texts[1]).toContain("[quota] 49998 of 50000");
    expect(result.isError).toBeFalsy();
  });

  it("surfaces a gateway error with the hint and isError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response('{"error":{"code":"invalid_key","message":"Unknown or inactive API key."}}', { status: 401 })
      )
    );
    const client = await connectedClient();
    const result = await client.callTool({
      name: "overpass_query",
      arguments: { query: "[out:json];node(1);out;" },
    });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("invalid_key");
    expect(text).toContain("overspan.dev");
  });

  it("rejects count_features with no area and never calls the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const client = await connectedClient();
    const result = await client.callTool({
      name: "count_features",
      arguments: { tags: { amenity: "cafe" } },
    });
    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toMatch(/lat and lon|south, west, north, east/);
  });

  it("starts keyless, lists tools, and answers tool calls with setup guidance", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const server = buildServer({ apiKey: "", apiUrl: "https://api.example.test", maxChars: 48000 });
    const client = new Client({ name: "keyless-client", version: "0.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    expect((await client.listTools()).tools.length).toBe(5);
    const result = await client.callTool({
      name: "overpass_query",
      arguments: { query: "[out:json];node(1);out;" },
    });
    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("OVERSPAN_API_KEY is not set");
    expect(text).toContain("overspan.dev/?utm_source=overspan-mcp&utm_medium=tool#pricing");
  });

  it("serves the cheat sheet resource", async () => {
    const client = await connectedClient();
    const read = await client.readResource({ uri: "overspan://overpass-ql" });
    const text = (read.contents as Array<{ text?: string }>)[0].text ?? "";
    expect(text).toContain("out count;");
    expect(text).toContain("(SOUTH,WEST,NORTH,EAST)");
  });
});
