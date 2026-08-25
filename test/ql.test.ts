import { describe, expect, it } from "vitest";
import { aroundClause, bboxClause, countQuery, featuresQuery, tagSelector } from "../src/ql.js";

describe("tagSelector", () => {
  it("builds an exact-value filter", () => {
    expect(tagSelector({ amenity: "cafe" })).toBe('["amenity"="cafe"]');
  });

  it("chains multiple filters in key order", () => {
    expect(tagSelector({ amenity: "cafe", cuisine: "coffee_shop" })).toBe(
      '["amenity"="cafe"]["cuisine"="coffee_shop"]'
    );
  });

  it("treats * and empty string as key-only filters", () => {
    expect(tagSelector({ opening_hours: "*" })).toBe('["opening_hours"]');
    expect(tagSelector({ opening_hours: "" })).toBe('["opening_hours"]');
  });

  it("escapes quotes and backslashes in keys and values", () => {
    expect(tagSelector({ name: 'The "Best" Cafe' })).toBe('["name"="The \\"Best\\" Cafe"]');
    expect(tagSelector({ note: "back\\slash" })).toBe('["note"="back\\\\slash"]');
  });

  it("rejects an empty filter set", () => {
    expect(() => tagSelector({})).toThrow(/at least one tag/i);
  });
});

describe("query builders", () => {
  const sel = tagSelector({ amenity: "cafe" });

  it("builds a bounded around query with a limit", () => {
    const ql = featuresQuery(sel, aroundClause({ lat: -36.85, lon: 174.76, radiusM: 500 }), 25);
    expect(ql).toBe('[out:json][timeout:25];nwr["amenity"="cafe"](around:500,-36.85,174.76);out center 25;');
  });

  it("builds a bbox query in south,west,north,east order", () => {
    const ql = featuresQuery(sel, bboxClause({ south: -36.86, west: 174.75, north: -36.84, east: 174.78 }), 10);
    expect(ql).toBe('[out:json][timeout:25];nwr["amenity"="cafe"](-36.86,174.75,-36.84,174.78);out center 10;');
  });

  it("builds a count query", () => {
    const ql = countQuery(sel, aroundClause({ lat: -36.85, lon: 174.76, radiusM: 500 }));
    expect(ql).toBe('[out:json][timeout:25];nwr["amenity"="cafe"](around:500,-36.85,174.76);out count;');
  });
});
