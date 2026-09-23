import { describe, it, expect } from "vitest";
import { parseCsv } from "../src/utils/csv.js";

describe("parseCsv", () => {
  it("parses a simple CSV with header", () => {
    const csv = "a,b,c\n1,2,3\n4,5,6";
    const rows = parseCsv(csv) as unknown as Record<string, string>[];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ a: "1", b: "2", c: "3" });
    expect(rows[1]).toEqual({ a: "4", b: "5", c: "6" });
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'name,note\nAnand,"high demand, low supply"';
    const rows = parseCsv(csv) as unknown as Record<string, string>[];
    expect(rows[0].note).toBe("high demand, low supply");
  });

  it("handles escaped double quotes inside quoted fields", () => {
    const csv = 'name,note\nAnand,"said ""hello"""';
    const rows = parseCsv(csv) as unknown as Record<string, string>[];
    expect(rows[0].note).toBe('said "hello"');
  });

  it("returns an empty array for an empty file", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("ignores trailing blank lines", () => {
    const csv = "a,b\n1,2\n\n\n";
    const rows = parseCsv(csv) as unknown as Record<string, string>[];
    expect(rows).toHaveLength(1);
  });
});
