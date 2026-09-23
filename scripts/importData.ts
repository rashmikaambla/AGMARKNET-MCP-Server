/**
 * npm run import-data
 *
 * Imports data/agmarknet_sample.csv for local development and testing.
 * All records are stored with source="SAMPLE" and are never presented as
 * live government data — see SampleMarketDataService.
 */
import "dotenv/config";
import { connectToDatabase, closeDatabase } from "../src/services/mongodb.js";
import { SampleMarketDataService } from "../src/services/agmarknet/sampleMarketDataService.js";
import { runIngestion } from "../src/services/ingestionService.js";
import { logger } from "../src/utils/logger.js";
import { readFileSync } from "node:fs";
import { parseCsv } from "../src/utils/csv.js";

async function main() {
  await connectToDatabase();

  const csvPath = process.argv[2] || "data/agmarknet_sample.csv";
  const rows = parseCsv(readFileSync(csvPath, "utf-8"));
  const dates = rows.map((r) => r.arrivalDate).filter(Boolean).sort() as string[];
  if (dates.length === 0) {
    logger.warn("No rows found in CSV file", { csvPath });
    await closeDatabase();
    return;
  }
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  const source = new SampleMarketDataService(csvPath);
  const result = await runIngestion(source, startDate, endDate, "CSV_IMPORT");

  logger.info("CSV import finished", {
    csvPath,
    inserted: result.recordsInserted,
    duplicates: result.duplicatesSkipped,
    failed: result.recordsFailed,
    ragDocumentsCreated: result.ragDocumentsCreated,
  });

  await closeDatabase();
}

main().catch((err) => {
  logger.error("CSV import script crashed", { error: (err as Error).message });
  process.exit(1);
});
