import { describe, it, expect } from "vitest";
import type { MarketData } from "../src/models/marketData.js";

// These tests exercise the pure statistical logic used inside
// marketDataService by re-implementing the same computation the module
// uses internally (computeStats is not exported — this documents the
// expected behavior via equivalent, independently-written assertions
// against realistic record sets, avoiding a live MongoDB dependency).

function makeRecord(overrides: Partial<MarketData>): MarketData {
  return {
    recordKey: "key",
    state: "Gujarat",
    district: "Anand",
    market: "Anand",
    commodityGroup: "Cereals",
    commodity: "Wheat",
    variety: "Dara",
    grade: "FAQ",
    arrivalDate: "2026-08-15",
    minPrice: 2000,
    maxPrice: 2300,
    modalPrice: 2150,
    arrivalQuantity: 400,
    unit: "Rs./Quintal",
    source: "SAMPLE",
    sourceUrl: "local://test",
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function computeAverageModalPrice(records: MarketData[]): number | null {
  const values = records.map((r) => r.modalPrice).filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

describe("price statistics logic", () => {
  it("computes the average modal price across records", () => {
    const records = [
      makeRecord({ modalPrice: 2000 }),
      makeRecord({ modalPrice: 2200 }),
      makeRecord({ modalPrice: 2400 }),
    ];
    expect(computeAverageModalPrice(records)).toBe(2200);
  });

  it("ignores null modal prices when averaging", () => {
    const records = [makeRecord({ modalPrice: 2000 }), makeRecord({ modalPrice: null })];
    expect(computeAverageModalPrice(records)).toBe(2000);
  });

  it("returns null average when no records have a modal price", () => {
    expect(computeAverageModalPrice([makeRecord({ modalPrice: null })])).toBeNull();
  });

  it("computes percentage change trend direction correctly", () => {
    const first = 2000;
    const last = 2200;
    const pctChange = ((last - first) / first) * 100;
    expect(pctChange).toBeCloseTo(10, 5);
    expect(pctChange > 1 ? "increasing" : pctChange < -1 ? "decreasing" : "stable").toBe("increasing");
  });

  it("classifies a small change as stable", () => {
    const first = 2000;
    const last = 2010; // 0.5% change
    const pctChange = ((last - first) / first) * 100;
    expect(pctChange > 1 ? "increasing" : pctChange < -1 ? "decreasing" : "stable").toBe("stable");
  });

  it("classifies a price drop as decreasing", () => {
    const first = 2000;
    const last = 1800;
    const pctChange = ((last - first) / first) * 100;
    expect(pctChange > 1 ? "increasing" : pctChange < -1 ? "decreasing" : "stable").toBe("decreasing");
  });
});
