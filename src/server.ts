import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "./config.js";
import { describeError, getUsage, quotaLine, runQuery, type ApiResult } from "./client.js";
import { aroundClause, bboxClause, countQuery, featuresQuery, tagSelector, type TagFilters } from "./ql.js";
import { shapeResponse } from "./truncate.js";
import { CHEATSHEET, DIFFERENCES } from "./content.js";
import { VERSION } from "./version.js";

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

const READ_ONLY = { readOnlyHint: true, openWorldHint: true };

function success(cfg: Config, result: ApiResult): ToolResult {
  const content: ToolResult["content"] = [
    { type: "text", text: shapeResponse(result.text, cfg.maxChars) },
  ];
  const quota = quotaLine(result.quota);
  if (quota) content.push({ type: "text", text: quota });
  return { content };
}

function failure(result: ApiResult): ToolResult {
  return { content: [{ type: "text", text: describeError(result) }], isError: true };
}

function errorText(err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text", text: message }], isError: true };
}

const tagsField = z
  .record(z.string())
  .describe(
    'OpenStreetMap tag filters, all must match. Use "*" as the value to match any value, e.g. {"amenity": "cafe"} or {"opening_hours": "*"}.'
  );

export function buildServer(cfg: Config): McpServer {
  const server = new McpServer({ name: "overspan", version: VERSION });

  server.registerTool(
    "overpass_query",
    {
      title: "Run raw Overpass QL",
      description:
        "Run a raw Overpass QL query against the Overspan hosted Overpass API (full-planet OpenStreetMap data, minutes behind live). " +
        "Use this when the helper tools are too narrow. Always bound the query to an area and cap the output (for example: out center 25;). " +
        "Start with [out:json]. Queries without [timeout:] get 25 seconds. " +
        "Read the overspan://overpass-ql resource for syntax and the overspan://differences resource for how this server differs from the public ones.",
      inputSchema: {
        query: z
          .string()
          .describe(
            "A complete Overpass QL query, e.g. [out:json][timeout:25];nwr[amenity=cafe](around:500,-36.85,174.76);out center 25;"
          ),
      },
      annotations: READ_ONLY,
    },
    async ({ query }) => {
      try {
        const result = await runQuery(cfg, query);
        return result.ok ? success(cfg, result) : failure(result);
      } catch (err) {
        return errorText(err);
      }
    }
  );

  server.registerTool(
    "find_nearby",
    {
      title: "Find features near a point",
      description:
        "Find OpenStreetMap features matching tag filters within a radius of a point. " +
        "Returns up to 'limit' elements with their tags and a centre coordinate. " +
        "Good first tool for questions like 'what cafes are near X'. For larger or unknown result sets, call count_features first.",
      inputSchema: {
        lat: z.number().min(-90).max(90).describe("Latitude of the centre point"),
        lon: z.number().min(-180).max(180).describe("Longitude of the centre point"),
        radius_m: z.number().min(1).max(50000).default(500).describe("Search radius in metres (default 500)"),
        tags: tagsField,
        limit: z.number().int().min(1).max(500).default(25).describe("Maximum elements to return (default 25)"),
      },
      annotations: READ_ONLY,
    },
    async ({ lat, lon, radius_m, tags, limit }) => {
      try {
        const ql = featuresQuery(
          tagSelector(tags as TagFilters),
          aroundClause({ lat, lon, radiusM: radius_m }),
          limit
        );
        const result = await runQuery(cfg, ql);
        return result.ok ? success(cfg, result) : failure(result);
      } catch (err) {
        return errorText(err);
      }
    }
  );

  server.registerTool(
    "features_in_bbox",
    {
      title: "Find features in a bounding box",
      description:
        "Find OpenStreetMap features matching tag filters inside a bounding box (south, west, north, east in decimal degrees). " +
        "Returns up to 'limit' elements with their tags and a centre coordinate. Keep boxes small; for city-sized areas call count_features first.",
      inputSchema: {
        south: z.number().min(-90).max(90),
        west: z.number().min(-180).max(180),
        north: z.number().min(-90).max(90),
        east: z.number().min(-180).max(180),
        tags: tagsField,
        limit: z.number().int().min(1).max(500).default(25).describe("Maximum elements to return (default 25)"),
      },
      annotations: READ_ONLY,
    },
    async ({ south, west, north, east, tags, limit }) => {
      try {
        if (south >= north) throw new Error("south must be less than north.");
        const ql = featuresQuery(
          tagSelector(tags as TagFilters),
          bboxClause({ south, west, north, east }),
          limit
        );
        const result = await runQuery(cfg, ql);
        return result.ok ? success(cfg, result) : failure(result);
      } catch (err) {
        return errorText(err);
      }
    }
  );

  server.registerTool(
    "count_features",
    {
      title: "Count matching features",
      description:
        "Count OpenStreetMap features matching tag filters in an area without returning them. Cheap. " +
        "Use this before pulling data when the result size is unknown. " +
        "Give either a point (lat, lon, radius_m) or a bounding box (south, west, north, east).",
      inputSchema: {
        tags: tagsField,
        lat: z.number().min(-90).max(90).optional(),
        lon: z.number().min(-180).max(180).optional(),
        radius_m: z.number().min(1).max(50000).optional().describe("Radius in metres, used with lat/lon (default 500)"),
        south: z.number().min(-90).max(90).optional(),
        west: z.number().min(-180).max(180).optional(),
        north: z.number().min(-90).max(90).optional(),
        east: z.number().min(-180).max(180).optional(),
      },
      annotations: READ_ONLY,
    },
    async ({ tags, lat, lon, radius_m, south, west, north, east }) => {
      try {
        let area: string;
        if (south !== undefined && west !== undefined && north !== undefined && east !== undefined) {
          if (south >= north) throw new Error("south must be less than north.");
          area = bboxClause({ south, west, north, east });
        } else if (lat !== undefined && lon !== undefined) {
          area = aroundClause({ lat, lon, radiusM: radius_m ?? 500 });
        } else {
          throw new Error("Give either lat and lon (with optional radius_m), or all of south, west, north, east.");
        }
        const result = await runQuery(cfg, countQuery(tagSelector(tags as TagFilters), area));
        return result.ok ? success(cfg, result) : failure(result);
      } catch (err) {
        return errorText(err);
      }
    }
  );

  server.registerTool(
    "get_usage",
    {
      title: "Check Overspan usage and limits",
      description:
        "Check this API key's tier, its limits, month-to-date quota, and recent request history. " +
        "Does not consume query quota. Use it to pace yourself when running many queries.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => {
      try {
        const result = await getUsage(cfg);
        return result.ok ? success(cfg, result) : failure(result);
      } catch (err) {
        return errorText(err);
      }
    }
  );

  server.registerResource(
    "overpass-ql-cheatsheet",
    "overspan://overpass-ql",
    {
      title: "Overpass QL cheat sheet",
      description:
        "The short version of Overpass QL: selectors, tag and spatial filters, output forms, and the habits that keep queries cheap.",
      mimeType: "text/plain",
    },
    async (uri) => ({ contents: [{ uri: uri.href, text: CHEATSHEET }] })
  );

  server.registerResource(
    "overspan-differences",
    "overspan://differences",
    {
      title: "Differences from the public Overpass servers",
      description: "Defaults, caps, error shape, and quota headers on the Overspan hosted Overpass API.",
      mimeType: "text/plain",
    },
    async (uri) => ({ contents: [{ uri: uri.href, text: DIFFERENCES }] })
  );

  server.registerPrompt(
    "write-bounded-overpass-query",
    {
      title: "Write a bounded Overpass query",
      description: "Turn a geographic question into a cheap, well-bounded Overpass QL query.",
      argsSchema: { question: z.string().describe("The geographic question to answer") },
    },
    ({ question }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Write an Overpass QL query to answer: ${question}\n\n` +
              "Rules: start with [out:json][timeout:25]. Bound the query to a specific area " +
              "(around, bbox, or a named area filter). If the result size is unknown, run out count; first. " +
              "Cap returned elements with a number, e.g. out center 25;. " +
              "Consult the overspan://overpass-ql resource for syntax, then run the query with the overpass_query tool.",
          },
        },
      ],
    })
  );

  return server;
}
