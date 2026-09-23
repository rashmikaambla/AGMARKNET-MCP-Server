import { describe, it, expect } from "vitest";
import {
  dailyMarketDataSchema,
  districtMarketDataSchema,
  commodityPriceSchema,
  priceTrendSchema,
  marketComparisonSchema,
  parseOrThrow,
  ValidationError,
} from "../src/utils/validation.js";

describe("validation", () => {
  it("accepts a valid daily market data input", () => {
    const result = parseOrThrow(dailyMarketDataSchema, { district: "Anand", date: "2026-08-15" });
    expect(result.district).toBe("Anand");
  });

  it("rejects an invalid date format", () => {
    expect(() => parseOrThrow(dailyMarketDataSchema, { district: "Anand", date: "15-08-2026" })).toThrow(
      ValidationError
    );
  });

  it("rejects an empty district", () => {
    expect(() => parseOrThrow(dailyMarketDataSchema, { district: "", date: "2026-08-15" })).toThrow(
      ValidationError
    );
  });

  it("rejects startDate after endDate for district market data", () => {
    expect(() =>
      parseOrThrow(districtMarketDataSchema, {
        district: "Anand",
        startDate: "2026-08-20",
        endDate: "2026-08-01",
      })
    ).toThrow(ValidationError);
  });

  it("rejects startDate after endDate for commodity price", () => {
    expect(() =>
      parseOrThrow(commodityPriceSchema, {
        commodity: "Wheat",
        startDate: "2026-08-20",
        endDate: "2026-08-01",
      })
    ).toThrow(ValidationError);
  });

  it("rejects negative days for price trend", () => {
    expect(() => parseOrThrow(priceTrendSchema, { commodity: "Wheat", days: -5 })).toThrow(ValidationError);
  });

  it("rejects zero days for price trend", () => {
    expect(() => parseOrThrow(priceTrendSchema, { commodity: "Wheat", days: 0 })).toThrow(ValidationError);
  });

  it("requires at least two markets for comparison", () => {
    expect(() =>
      parseOrThrow(marketComparisonSchema, {
        commodity: "Wheat",
        markets: ["Anand"],
        startDate: "2026-08-01",
        endDate: "2026-08-20",
      })
    ).toThrow(ValidationError);
  });

  it("accepts a valid market comparison input", () => {
    const result = parseOrThrow(marketComparisonSchema, {
      commodity: "Wheat",
      markets: ["Anand", "Borsad"],
      startDate: "2026-08-01",
      endDate: "2026-08-20",
    });
    expect(result.markets.length).toBe(2);
  });
});
