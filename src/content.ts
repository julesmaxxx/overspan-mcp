export const DIFFERENCES = `How Overspan differs from the public Overpass servers

- A query with no [timeout:] gets 25 seconds, not the public default of 180.
  Set [timeout:] explicitly for heavy queries, up to the key's tier cap
  (Indie 60 s, Pro 180 s, Business 300 s).
- A query with no [maxsize:] gets 256 MB. Tier caps: 512 MB / 1 GB / 2 GB.
- Over-cap values are rejected with HTTP 400, not clamped.
- Errors are JSON: {"error": {"code": "...", "message": "..."}}, with a
  Retry-After header where retrying makes sense.
- Every keyed response carries quota headers: X-Overspan-Quota-Limit,
  X-Overspan-Quota-Remaining, X-Overspan-Quota-Reset.
- Monthly quota counts one unit per accepted request. Rejected requests do
  not consume quota. Rate limits per tier: 60 / 300 / 600 requests per
  minute; concurrent queries: 2 / 4 / 8.
- Output carries full metadata (out meta works) and matches the public
  servers element for element. Attic (historical [date:]) queries are not
  enabled.
- The data tracks the live OpenStreetMap replication feed, normally within
  a couple of minutes.`;

export const CHEATSHEET = `Overpass QL, the short version

Every query: settings; statements; output.

  [out:json][timeout:25];
  nwr["amenity"="cafe"](around:500,-36.85,174.76);
  out center 25;

Element types
  node  way  relation  nwr (any of the three)

Tag filters (chain them; all must match)
  ["amenity"="cafe"]     exact value
  ["opening_hours"]      key exists, any value
  ["name"~"Coffee"]      regex match
  ["amenity"!="parking"] negation

Spatial filters
  (around:RADIUS_M,LAT,LON)          circle
  (SOUTH,WEST,NORTH,EAST)            bounding box, in that order
  (area.a)                           inside a named area, resolved first:
      area["name"="Wellington"]->.a;
      nwr["amenity"="cafe"](area.a);

Combining
  ( nwr["amenity"="cafe"](...); nwr["shop"="coffee"](...); );   union
  >;    recurse down (members of found relations/ways)
  <;    recurse up

Output forms (pick one, always end with ;)
  out center 25;   up to 25 elements, tags plus a centre point. Good default.
  out count;       just the number of matches. Cheap. Use it first.
  out meta;        full history metadata per element. Verbose.
  out;             full geometry detail. Verbose for ways and relations.

Discipline that keeps queries cheap and answers small
  1. Always bound the area: around, bbox, or area filter. Never planet-wide.
  2. Prefer out count; first when the size of the result is unknown.
  3. Put a number after out (out center 25;) to cap the elements returned.
  4. [timeout:25] is the default here; raise it only for genuinely heavy work.`;
