import { describe, expect, it } from "vitest";
import { shapeResponse } from "../src/truncate.js";

describe("shapeResponse", () => {
  it("returns short responses unchanged", () => {
    const text = JSON.stringify({ elements: [{ id: 1 }] });
    expect(shapeResponse(text, 1000)).toBe(text);
  });

  it("slices the elements array of an oversized Overpass response and says so", () => {
    const elements = Array.from({ length: 200 }, (_, i) => ({
      type: "node",
      id: i,
      tags: { name: `Cafe number ${i}`, amenity: "cafe" },
    }));
    const text = JSON.stringify({ version: 0.6, elements });
    const shaped = shapeResponse(text, 4000);
    expect(shaped.length).toBeLessThanOrEqual(4000);
    const parsed = JSON.parse(shaped);
    expect(parsed.elements.length).toBeGreaterThan(0);
    expect(parsed.elements.length).toBeLessThan(200);
    expect(parsed.overspan_mcp_truncated).toMatch(/of 200 elements/);
    expect(parsed.version).toBe(0.6);
  });

  it("falls back to plain truncation for non-JSON bodies", () => {
    const text = "x".repeat(5000);
    const shaped = shapeResponse(text, 2000);
    expect(shaped.startsWith("x".repeat(2000))).toBe(true);
    expect(shaped).toMatch(/truncated/);
  });
});
