/**
 * npm run sync
 *
 * Manually triggers the same synchronization service used by the daily
 * cron job. Intentionally reuses runDailySync() so there is only one
 * ingestion code path (see src/jobs/dailySyncJob.ts).
 */
import "dotenv/config";
import { connectToDatabase, closeDatabase } from "../src/services/mongodb.js";
import { runDailySync } from "../src/jobs/dailySyncJob.js";
import { logger } from "../src/utils/logger.js";

async function main() {
  await connectToDatabase();
  await runDailySync();
  await closeDatabase();
}

main().catch((err) => {
  logger.error("Manual sync script crashed", { error: (err as Error).message });
  process.exit(1);
});
