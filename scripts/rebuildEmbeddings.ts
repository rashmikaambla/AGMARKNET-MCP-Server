/**
 * npm run rebuild-embeddings
 *
 * Regenerates RAG documents/embeddings for every stored market_data record.
 * Useful after switching EMBEDDING_PROVIDER/EMBEDDING_MODEL, since existing
 * rag_documents were built with the previous model.
 */
import "dotenv/config";
import { connectToDatabase, closeDatabase, getDb } from "../src/services/mongodb.js";
import { MARKET_DATA_COLLECTION, type MarketData } from "../src/models/marketData.js";
import { createRagDocumentsForRecords } from "../src/services/ragService.js";
import { updateSystemMetadata } from "../src/repositories/metadataRepository.js";
import { logger } from "../src/utils/logger.js";

const BATCH_SIZE = 200;

async function main() {
  await connectToDatabase();
  await updateSystemMetadata({ ragIndexStatus: "BUILDING" });

  const collection = getDb().collection<MarketData>(MARKET_DATA_COLLECTION);
  const total = await collection.countDocuments();
  logger.info("Rebuilding embeddings for all stored records", { total });

  let processed = 0;
  let ragDocumentsCreated = 0;
  const cursor = collection.find({});
  let batch: MarketData[] = [];

  async function flush() {
    if (batch.length === 0) return;
    const result = await createRagDocumentsForRecords(batch);
    ragDocumentsCreated += result.ragDocumentsCreated;
    processed += batch.length;
    logger.info("Embedding rebuild progress", { processed, total });
    batch = [];
  }

  for await (const record of cursor) {
    batch.push(record);
    if (batch.length >= BATCH_SIZE) {
      await flush();
    }
  }
  await flush();

  await updateSystemMetadata({ ragIndexStatus: "READY" });
  logger.info("Embedding rebuild complete", { processed, ragDocumentsCreated });

  await closeDatabase();
}

main().catch((err) => {
  logger.error("Rebuild embeddings script crashed", { error: (err as Error).message });
  process.exit(1);
});
