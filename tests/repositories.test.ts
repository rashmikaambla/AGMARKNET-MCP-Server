/**
 * Integration tests against a real MongoDB instance.
 *
 * These are SKIPPED automatically if MONGODB_URI is not reachable, so
 * `npm test` still passes in environments without MongoDB (e.g. this
 * sandbox). To actually exercise them: start MongoDB locally
 * (see README "MongoDB setup") and run `npm test` again.
 *
 * IMPORTANT: uses a dedicated test database name so it never touches your
 * real permanent historical dataset.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoClient } from "mongodb";

const TEST_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gujarat_agmarknet";
const TEST_DB_NAME = "gujarat_agmarknet_test";

// Top-level await: probe MongoDB availability once, before test collection,
// so we can synchronously decide whether to skip the whole suite below.
let mongoAvailable = false;
try {
  const probe = new MongoClient(TEST_URI, { serverSelectionTimeoutMS: 1500 });
  await probe.connect();
  await probe.close();
  mongoAvailable = true;
} catch {
  mongoAvailable = false;
  // eslint-disable-next-line no-console
  console.warn(
    "\n[integration tests] MongoDB not reachable at " +
      TEST_URI +
      " — skipping repository integration tests.\n" +
      "Start MongoDB and re-run `npm test` to execute them.\n"
  );
}

describe.skipIf(!mongoAvailable)("marketDataRepository (integration)", () => {
  let client: MongoClient;

  beforeAll(async () => {
    process.env.MONGODB_URI = TEST_URI;
    process.env.MONGODB_DATABASE = TEST_DB_NAME;
    client = new MongoClient(TEST_URI);
    await client.connect();
    await client.db(TEST_DB_NAME).dropDatabase();
  });

  afterAll(async () => {
    await client.db(TEST_DB_NAME).dropDatabase();
    await client.close();
  });

  it("connects, ensures indexes, and inserts a de-duplicated record", async () => {
    const { connectToDatabase, closeDatabase } = await import("../src/services/mongodb.js");
    const { insertManyIfNotExists } = await import("../src/repositories/marketDataRepository.js");
    const { normalizeMarketRow } = await import("../src/utils/normalization.js");

    await connectToDatabase();

    const row = {
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
    const record = normalizeMarketRow(row, "SAMPLE", "local://test");

    const first = await insertManyIfNotExists([record]);
    expect(first.inserted).toBe(1);
    expect(first.duplicates).toBe(0);

    // Re-inserting the exact same record must be a no-op (idempotent).
    const second = await insertManyIfNotExists([record]);
    expect(second.inserted).toBe(0);
    expect(second.duplicates).toBe(1);

    await closeDatabase();
  });
});
