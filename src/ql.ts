export type TagFilters = Record<string, string>;

function escapeQl(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function tagSelector(tags: TagFilters): string {
  const keys = Object.keys(tags);
  if (keys.length === 0) {
    throw new Error("At least one tag filter is required, e.g. {\"amenity\": \"cafe\"}.");
  }
  return keys
    .map((key) => {
      const value = tags[key];
      if (value === "*" || value === "") return `["${escapeQl(key)}"]`;
      return `["${escapeQl(key)}"="${escapeQl(value)}"]`;
    })
    .join("");
}

export interface AroundArea {
  lat: number;
  lon: number;
  radiusM: number;
}

export interface BboxArea {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function aroundClause(area: AroundArea): string {
  return `(around:${area.radiusM},${area.lat},${area.lon})`;
}

export function bboxClause(area: BboxArea): string {
  return `(${area.south},${area.west},${area.north},${area.east})`;
}

export function featuresQuery(selector: string, areaClause: string, limit: number): string {
  return `[out:json][timeout:25];nwr${selector}${areaClause};out center ${limit};`;
}

export function countQuery(selector: string, areaClause: string): string {
  return `[out:json][timeout:25];nwr${selector}${areaClause};out count;`;
}
