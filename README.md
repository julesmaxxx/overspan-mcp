# overspan-mcp

An MCP (Model Context Protocol) server for [Overspan](https://overspan.dev), the hosted Overpass API. It gives Claude, Cursor, and any other MCP client direct, metered access to full-planet OpenStreetMap data: raw Overpass QL plus helper tools for nearby search, bounding-box search, counting, and usage checks.

You need an Overspan API key. Plans start at $19/month at [overspan.dev](https://overspan.dev/#pricing); the key arrives by email after checkout, no account needed.

## Quickstart

### Claude Code

```bash
claude mcp add overspan --env OVERSPAN_API_KEY=YOUR_KEY -- npx -y overspan-mcp
```

### Claude Desktop, Cursor, and other JSON-configured clients

```json
{
  "mcpServers": {
    "overspan": {
      "command": "npx",
      "args": ["-y", "overspan-mcp"],
      "env": {
        "OVERSPAN_API_KEY": "YOUR_KEY"
      }
    }
  }
}
```

The key must be in the server's `env` block. MCP clients start servers with their own environment, so a variable exported in your shell profile will not reach it. Treat any config file containing the key as a secret; in Claude Code's `.mcp.json` you can write `"OVERSPAN_API_KEY": "${OVERSPAN_KEY}"` to keep the key in your environment and out of the file.

## Tools

| Tool | What it does |
|---|---|
| `overpass_query` | Run a raw Overpass QL query. The escape hatch when the helpers are too narrow. |
| `find_nearby` | Features matching tag filters within a radius of a point. |
| `features_in_bbox` | Features matching tag filters inside a bounding box. |
| `count_features` | Count matches in an area without returning them. Cheap; use it before pulling data. |
| `get_usage` | The key's tier, limits, month-to-date quota, and recent requests. Never consumes quota. |

The server also exposes two resources the model can read (`overspan://overpass-ql`, a QL cheat sheet, and `overspan://differences`, how Overspan differs from the public servers) and one prompt (`write-bounded-overpass-query`).

## Behaviour worth knowing

- The key is sent as an `Authorization: Bearer` header, never in a URL.
- Every successful tool result carries a quota line (`[quota] 49998 of 50000 monthly requests remaining`) so an agent can pace itself. `get_usage` gives the full picture and is free to call.
- Errors come back in plain language with the gateway's error code, what it means, and whether to retry. Rejected requests do not consume quota, and a runaway loop is bounded by the key's own rate and concurrency caps, never by a larger bill.
- Oversized responses are trimmed to fit a model's context: for Overpass JSON the element list is cut and the result says how many elements were dropped. Raise the cap with `OVERSPAN_MAX_RESPONSE_CHARS` if you want more.
- Queries without `[timeout:]` get 25 seconds. Set it explicitly for heavy queries, up to your tier's cap.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OVERSPAN_API_KEY` | yes | | Your Overspan API key |
| `OVERSPAN_API_URL` | no | `https://api.overspan.dev` | Override the API endpoint |
| `OVERSPAN_MAX_RESPONSE_CHARS` | no | `48000` | Truncation threshold for tool results |

## Data licence

Results are OpenStreetMap data, licensed under the [Open Database License](https://opendatacommons.org/licenses/odbl/). Anything you publish that shows or derives from this data needs a visible credit reaching [openstreetmap.org/copyright](https://www.openstreetmap.org/copyright). Your Overspan subscription pays for hosting and access, not for the data, and does not change those obligations.

## Development

```bash
npm install
npm run build
npm test
```

The test suite covers the query builders, response shaping, error mapping, and a full in-memory MCP client round trip.

## Links

- [Overspan documentation](https://overspan.dev/docs/)
- [Error reference](https://overspan.dev/docs/errors)
- [Usage dashboard](https://overspan.dev/usage)

Overspan is an independent service, not affiliated with the OpenStreetMap Foundation or the Overpass API project.

MIT licensed.
