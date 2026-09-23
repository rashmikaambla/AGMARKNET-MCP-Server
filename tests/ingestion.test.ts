import { describe, it, expect } from "vitest";
import { normalizeMarketRow } from "../src/utils/normalization.js";
import { buildRecordKey } from "../src/utils/recordKey.js";
import type { RawMarketRow } from "../src/utils/normalization.js";

/**
 * These tests exercise the ingestion pipeline's duplicate-detection
 * building blocks (normalization + recordKey) using a mocked AGMARKNET
 * response, per the project requirement that automated tests must never
 * depend on the live AGMARKNET website.
 */
describe("ingestion duplicate detection (mocked source)", () => {
  const mockAgmarknetResponse: RawMarketRow[] = [
    {
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
    },
    // Same logical record repeated (simulates AGMARKNET returning the same
    // row twice across a paginated response, or a re-run of the same sync).
    {
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
    },
    // Genuinely distinct record (different market).
    {
      state: "Gujarat",
      district: "Anand",
      market: "Borsad",
      commodityGroup: "Cereals",
      commodity: "Wheat",
      variety: "Dara",
      grade: "FAQ",
      arrivalDate: "2026-08-15",
      minPrice: "2050",
      maxPrice: "2350",
      modalPrice: "2200",
      arrivalQuantity: "300",
      unit: "Rs./Quintal",
    },
  ];

  it("assigns identical record keys to identical rows", () => {
    const normalized = mockAgmarknetResponse.map((row) => normalizeMarketRow(row, "AGMARKNET", "https://agmarknet.gov.in/home"));
    expect(normalized[0].recordKey).toBe(normalized[1].recordKey);
  });

  it("assigns a different record key to a genuinely distinct row", () => {
    const normalized = mockAgmarknetResponse.map((row) => normalizeMarketRow(row, "AGMARKNET", "https://agmarknet.gov.in/home"));
    expect(normalized[0].recordKey).not.toBe(normalized[2].recordKey);
  });

  it("would deduplicate the mocked response down to 2 unique records", () => {
    const normalized = mockAgmarknetResponse.map((row) => normalizeMarketRow(row, "AGMARKNET", "https://agmarknet.gov.in/home"));
    const uniqueKeys = new Set(normalized.map((r) => r.recordKey));
    expect(uniqueKeys.size).toBe(2);
  });

  it("running ingestion twice on the same mocked data never grows beyond unique records", () => {
    // Simulates "running the same synchronization twice must not create duplicates"
    const firstRun = mockAgmarknetResponse.map((row) => normalizeMarketRow(row, "AGMARKNET", "https://agmarknet.gov.in/home"));
    const secondRun = mockAgmarknetResponse.map((row) => normalizeMarketRow(row, "AGMARKNET", "https://agmarknet.gov.in/home"));

    const allKeys = new Set([...firstRun, ...secondRun].map((r) => r.recordKey));
    expect(allKeys.size).toBe(2); // still just 2 unique logical records
  });

  it("marks records from the sample source distinctly from AGMARKNET source", () => {
    const key = buildRecordKey({
      state: "Gujarat",
      district: "Anand",
      market: "Anand",
      commodityGroup: "Cereals",
      commodity: "Wheat",
      variety: "Dara",
      grade: "FAQ",
      arrivalDate: "2026-08-15",
    });
    const sampleRecord = normalizeMarketRow(mockAgmarknetResponse[0], "SAMPLE", "local://data/agmarknet_sample.csv");
    // recordKey does not encode source (by design — the same real-world
    // record shouldn't get two keys), but the `source` field must still
    // correctly distinguish SAMPLE from AGMARKNET data.
    expect(sampleRecord.recordKey).toBe(key);
    expect(sampleRecord.source).toBe("SAMPLE");
  });
});
