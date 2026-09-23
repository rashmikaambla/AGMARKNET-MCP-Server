import { describe, it, expect } from "vitest";
import { buildRecordKey } from "../src/utils/recordKey.js";
import { normalizeMarketRow, NormalizationError } from "../src/utils/normalization.js";

describe("recordKey", () => {
  const base = {
    state: "Gujarat",
    district: "Anand",
    market: "Anand",
    commodityGroup: "Cereals",
    commodity: "Wheat",
    variety: "Dara",
    grade: "FAQ",
    arrivalDate: "2026-08-15",
  };

  it("produces the same key for identical input", () => {
    expect(buildRecordKey(base)).toBe(buildRecordKey({ ...base }));
  });

  it("is case- and whitespace-insensitive (prevents accidental duplicates)", () => {
    const varied = { ...base, market: "  ANAND  ", commodity: "wheat" };
    expect(buildRecordKey(base)).toBe(buildRecordKey(varied));
  });

  it("produces different keys for different arrival dates", () => {
    expect(buildRecordKey(base)).not.toBe(buildRecordKey({ ...base, arrivalDate: "2026-08-16" }));
  });

  it("produces different keys for different markets", () => {
    expect(buildRecordKey(base)).not.toBe(buildRecordKey({ ...base, market: "Borsad" }));
  });

  it("handles null variety/grade distinctly from a real value", () => {
    const withNulls = { ...base, variety: null, grade: null };
    expect(buildRecordKey(withNulls)).not.toBe(buildRecordKey(base));
  });
});

describe("normalizeMarketRow", () => {
  const validRow = {
    state: "Gujarat",
    district: "Anand",
    market: "Anand",
    commodityGroup: "Cereals",
    commodity: "Wheat",
    variety: "Dara",
    grade: "FAQ",
    arrivalDate: "2026-08-15",
    minPrice: "2100",
    maxPrice: "2400",
    modalPrice: "2250",
    arrivalQuantity: "500",
    unit: "Rs./Quintal",
  };

  it("normalizes a complete valid row", () => {
    const result = normalizeMarketRow(validRow, "SAMPLE", "local://test");
    expect(result.district).toBe("Anand");
    expect(result.minPrice).toBe(2100);
    expect(result.source).toBe("SAMPLE");
    expect(result.recordKey).toHaveLength(64); // sha256 hex
  });

  it("stores missing optional fields as null, never invents values", () => {
    const { minPrice, maxPrice, ...rest } = validRow;
    const result = normalizeMarketRow(rest as typeof validRow, "SAMPLE", "local://test");
    expect(result.minPrice).toBeNull();
    expect(result.maxPrice).toBeNull();
  });

  it("throws NormalizationError when a required field is missing", () => {
    const { district, ...rest } = validRow;
    expect(() => normalizeMarketRow(rest as typeof validRow, "SAMPLE", "local://test")).toThrow(
      NormalizationError
    );
  });

  it("throws NormalizationError for an invalid arrivalDate", () => {
    expect(() =>
      normalizeMarketRow({ ...validRow, arrivalDate: "15-08-2026" }, "SAMPLE", "local://test")
    ).toThrow(NormalizationError);
  });

  it("parses numeric strings with thousands separators", () => {
    const result = normalizeMarketRow({ ...validRow, modalPrice: "2,250" }, "SAMPLE", "local://test");
    expect(result.modalPrice).toBe(2250);
  });
});
