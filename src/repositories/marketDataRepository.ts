import { getDb } from "../services/mongodb.js";
import {
  MARKET_DATA_COLLECTION,
  type MarketData,
  type NewMarketData,
} from "../models/marketData.js";

function collection() {
  return getDb().collection<MarketData>(MARKET_DATA_COLLECTION);
}

export interface InsertManyResult {
  inserted: number;
  duplicates: number;
  failed: number;
  insertedRecords: MarketData[];
}

/**
 * Inserts records, skipping any whose recordKey already exists.
 * This is the core of the append-only, duplicate-safe ingestion pipeline.
 * Running this twice with the same input never creates duplicates.
 */
export async function insertManyIfNotExists(records: NewMarketData[]): Promise<InsertManyResult> {
  if (records.length === 0) {
    return { inserted: 0, duplicates: 0, failed: 0, insertedRecords: [] };
  }

  const col = collection();
  const keys = records.map((r) => r.recordKey);
  const existing = await col
    .find({ recordKey: { $in: keys } }, { projection: { recordKey: 1 } })
    .toArray();
  const existingKeys = new Set(existing.map((e) => e.recordKey));

  const toInsert = records.filter((r) => !existingKeys.has(r.recordKey));
  const duplicates = records.length - toInsert.length;

  if (toInsert.length === 0) {
    return { inserted: 0, duplicates, failed: 0, insertedRecords: [] };
  }

  try {
    const result = await col.insertMany(toInsert, { ordered: false });
    const insertedRecords = toInsert.map((r, i) => ({
      ...r,
      _id: result.insertedIds[i],
    })) as MarketData[];
    return {
      inserted: result.insertedCount,
      duplicates,
      failed: toInsert.length - result.insertedCount,
      insertedRecords,
    };
  } catch (err: any) {
    // Handle partial failures from ordered:false bulk writes (e.g. a race
    // condition duplicate insert that slipped past the pre-check).
    const insertedCount = err?.result?.insertedCount ?? 0;
    logDuplicateKeyWarning(err);
    return {
      inserted: insertedCount,
      duplicates: duplicates + (toInsert.length - insertedCount),
      failed: 0,
      insertedRecords: [],
    };
  }
}

function logDuplicateKeyWarning(err: any) {
  if (err?.code !== 11000) {
    throw err;
  }
}

export interface DateRangeQuery {
  district?: string;
  market?: string;
  commodity?: string;
  commodityGroup?: string;
  state?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
}

export async function findByFilters(query: DateRangeQuery): Promise<MarketData[]> {
  const filter: Record<string, unknown> = {};
  if (query.district) filter.district = query.district;
  if (query.market) filter.market = query.market;
  if (query.commodity) filter.commodity = query.commodity;
  if (query.commodityGroup) filter.commodityGroup = query.commodityGroup;
  if (query.state) filter.state = query.state;
  if (query.date) filter.arrivalDate = query.date;
  if (query.startDate || query.endDate) {
    const range: Record<string, string> = {};
    if (query.startDate) range.$gte = query.startDate;
    if (query.endDate) range.$lte = query.endDate;
    filter.arrivalDate = range;
  }
  return collection().find(filter).sort({ arrivalDate: -1 }).toArray();
}

export async function findByMarkets(
  markets: string[],
  commodity: string,
  startDate: string,
  endDate: string
): Promise<MarketData[]> {
  return collection()
    .find({
      market: { $in: markets },
      commodity,
      arrivalDate: { $gte: startDate, $lte: endDate },
    })
    .sort({ arrivalDate: 1 })
    .toArray();
}

export async function countAll(): Promise<number> {
  return collection().countDocuments();
}

export async function distinctDistricts(state?: string): Promise<string[]> {
  return collection().distinct("district", state ? { state } : {});
}

export async function distinctMarkets(district?: string): Promise<string[]> {
  return collection().distinct("market", district ? { district } : {});
}

export async function distinctCommodities(district?: string): Promise<string[]> {
  return collection().distinct("commodity", district ? { district } : {});
}

export async function latestArrivalDate(): Promise<string | null> {
  const [latest] = await collection()
    .find({}, { projection: { arrivalDate: 1 } })
    .sort({ arrivalDate: -1 })
    .limit(1)
    .toArray();
  return latest?.arrivalDate ?? null;
}
