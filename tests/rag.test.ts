import { describe, it, expect, beforeEach } from "vitest";
import { LocalHashEmbeddingService } from "../src/services/embeddingService.js";
import { buildRagContent } from "../src/services/ragService.js";
import type { MarketData } from "../src/models/marketData.js";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

describe("LocalHashEmbeddingService", () => {
  let service: LocalHashEmbeddingService;

  beforeEach(() => {
    service = new LocalHashEmbeddingService(128);
  });

  it("produces a vector of the configured dimensionality", async () => {
    const vector = await service.embed("wheat price in Anand");
    expect(vector).toHaveLength(128);
  });

  it("is deterministic: same text always produces the same vector", async () => {
    const v1 = await service.embed("wheat price in Anand market");
    const v2 = await service.embed("wheat price in Anand market");
    expect(v1).toEqual(v2);
  });

  it("produces a unit-normalized vector", async () => {
    const vector = await service.embed("wheat price in Anand");
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeGreaterThan(0.99);
    expect(magnitude).toBeLessThan(1.01);
  });

  it("gives higher similarity to related text than unrelated text", async () => {
    const base = await service.embed("Wheat modal price in Anand market Gujarat");
    const related = await service.embed("Wheat prices Anand Gujarat market data");
    const unrelated = await service.embed("Weather forecast rainfall temperature monsoon");

    const simRelated = cosineSimilarity(base, related);
    const simUnrelated = cosineSimilarity(base, unrelated);
    expect(simRelated).toBeGreaterThan(simUnrelated);
  });

  it("embedBatch produces the same vectors as individual embed calls", async () => {
    const texts = ["wheat Anand", "bajra Rajkot"];
    const batch = await service.embedBatch(texts);
    const individual = await Promise.all(texts.map((t) => service.embed(t)));
    expect(batch).toEqual(individual);
  });
});

describe("buildRagContent", () => {
  const record: MarketData = {
    recordKey: "abc123",
    state: "Gujarat",
    district: "Anand",
    market: "Anand",
    commodityGroup: "Cereals",
    commodity: "Wheat",
    variety: "Dara",
    grade: "FAQ",
    arrivalDate: "2026-08-15",
    minPrice: 2100,
    maxPrice: 2400,
    modalPrice: 2250,
    arrivalQuantity: 500,
    unit: "Rs./Quintal",
    source: "SAMPLE",
    sourceUrl: "local://test",
    scrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("includes all real field values from the record", () => {
    const content = buildRagContent(record);
    expect(content).toContain("Anand");
    expect(content).toContain("Wheat");
    expect(content).toContain("2026-08-15");
    expect(content).toContain("2250");
    expect(content).toContain("SAMPLE");
  });

  it("never invents values for missing fields", () => {
    const withNulls: MarketData = { ...record, minPrice: null, maxPrice: null, modalPrice: null };
    const content = buildRagContent(withNulls);
    expect(content).toContain("not available");
    expect(content).not.toMatch(/Minimum price: \d/);
  });
});
