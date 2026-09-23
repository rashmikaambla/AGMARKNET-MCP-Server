import "dotenv/config";
import { connectToDatabase, getDb } from "../src/services/mongodb.js";

async function clearData() {
  await connectToDatabase();

  const db = getDb();

  console.log("Clearing existing data...");

  const collections = [
    "market_data",
    "markets",
    "rag_documents",
    "ingestion_logs",
    "system_metadata",
  ];

  for (const collection of collections) {
    const result = await db.collection(collection).deleteMany({});
    console.log(`${collection}: ${result.deletedCount} documents deleted`);
  }

  console.log("Existing database data cleared successfully.");

  process.exit(0);
}

clearData().catch((error) => {
  console.error("Error clearing database:", error);
  process.exit(1);
});