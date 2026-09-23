import { getDb } from "../services/mongodb.js";
import { MARKETS_COLLECTION, type Market } from "../models/market.js";

function collection() {
  return getDb().collection<Market>(MARKETS_COLLECTION);
}

/** Upserts a market discovered from real (or sample) data. Never fabricates markets. */
export async function upsertMarket(input: {
  state: string;
  district: string;
  market: string;
  source: string;
  sourceUrl: string;
}): Promise<void> {
  const now = new Date();
  await collection().updateOne(
    { state: input.state, district: input.district, market: input.market },
    {
      $set: {
        source: input.source,
        sourceUrl: input.sourceUrl,
        lastSeenAt: now,
        updatedAt: now,
      },
      $setOnInsert: {
        state: input.state,
        district: input.district,
        market: input.market,
        createdAt: now,
      },
    },
    { upsert: true }
  );
}

export async function listMarkets(district?: string): Promise<Market[]> {
  const filter = district ? { district } : {};
  return collection().find(filter).sort({ district: 1, market: 1 }).toArray();
}
