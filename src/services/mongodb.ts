import { MongoClient, type Db } from "mongodb";
import { logger } from "../utils/logger.js";
import { MARKET_DATA_COLLECTION } from "../models/marketData.js";
import { MARKETS_COLLECTION } from "../models/market.js";
import { RAG_DOCUMENTS_COLLECTION } from "../models/ragDocument.js";
import { INGESTION_LOGS_COLLECTION } from "../models/ingestionLog.js";
import { SYSTEM_METADATA_COLLECTION } from "../models/systemMetadata.js";

let client: MongoClient | null = null;
let db: Db | null = null;

function getUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Copy .env.example to .env and configure it.");
  }
  return uri;
}

function getDatabaseName(): string {
  return process.env.MONGODB_DATABASE || "gujarat_agmarknet";
}

export async function connectToDatabase(): Promise<Db> {
  if (db) return db;

  const uri = getUri();
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
  });

  logger.info("Connecting to MongoDB...");
  await client.connect();
  db = client.db(getDatabaseName());
  logger.info("MongoDB connected", { database: getDatabaseName() });

  await ensureIndexes(db);
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("Database not connected. Call connectToDatabase() first.");
  }
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info("MongoDB connection closed");
  }
}

/**
 * Creates all required indexes. Idempotent — safe to call on every startup.
 *
 * IMPORTANT: No TTL index is created on market_data. This collection is a
 * permanent, append-only historical dataset and must never expire records
 * automatically (see project requirement: no rolling 365-day retention).
 */
async function ensureIndexes(database: Db): Promise<void> {
  const marketData = database.collection(MARKET_DATA_COLLECTION);
  await marketData.createIndex({ recordKey: 1 }, { unique: true, name: "uniq_record_key" });
  await marketData.createIndex({ state: 1 }, { name: "idx_state" });
  await marketData.createIndex({ district: 1 }, { name: "idx_district" });
  await marketData.createIndex({ market: 1 }, { name: "idx_market" });
  await marketData.createIndex({ commodity: 1 }, { name: "idx_commodity" });
  await marketData.createIndex({ commodityGroup: 1 }, { name: "idx_commodity_group" });
  await marketData.createIndex({ arrivalDate: 1 }, { name: "idx_arrival_date" });
  await marketData.createIndex(
    { district: 1, commodity: 1, arrivalDate: -1 },
    { name: "idx_district_commodity_date" }
  );
  await marketData.createIndex(
    { market: 1, commodity: 1, arrivalDate: -1 },
    { name: "idx_market_commodity_date" }
  );
  await marketData.createIndex({ state: 1, arrivalDate: -1 }, { name: "idx_state_date" });

  const markets = database.collection(MARKETS_COLLECTION);
  await markets.createIndex(
    { state: 1, district: 1, market: 1 },
    { unique: true, name: "uniq_state_district_market" }
  );

  const ragDocuments = database.collection(RAG_DOCUMENTS_COLLECTION);
  await ragDocuments.createIndex({ documentId: 1 }, { unique: true, name: "uniq_document_id" });
  await ragDocuments.createIndex(
    { marketDataRecordKey: 1 },
    { unique: true, name: "uniq_market_data_record_key" }
  );
  await ragDocuments.createIndex({ "metadata.district": 1 }, { name: "idx_meta_district" });
  await ragDocuments.createIndex({ "metadata.commodity": 1 }, { name: "idx_meta_commodity" });
  await ragDocuments.createIndex({ "metadata.date": 1 }, { name: "idx_meta_date" });

  const ingestionLogs = database.collection(INGESTION_LOGS_COLLECTION);
  await ingestionLogs.createIndex({ startedAt: -1 }, { name: "idx_started_at" });
  await ingestionLogs.createIndex({ mode: 1 }, { name: "idx_mode" });

  const systemMetadata = database.collection(SYSTEM_METADATA_COLLECTION);
  await systemMetadata.createIndex({ key: 1 }, { unique: true, name: "uniq_key" });

  logger.debug("MongoDB indexes ensured");
}
