/**
 * npm run backfill -- --start=2025-09-01 --end=2026-09-01
 * npm run backfill -- --start=2025-09-01 --end=2026-09-01 --source=sample
 *
 * Fetches and inserts historical data for an arbitrary date range without
 * touching any previously stored records. Use --source=sample to exercise
 * the full pipeline against the bundled sample CSV instead of the live
 * AGMARKNET site.
 */
import "dotenv/config";
import { connectToDatabase, closeDatabase } from "../src/services/mongodb.js";
import { AgmarknetService } from "../src/services/agmarknet/agmarknetService.js";
import { SampleMarketDataService } from "../src/services/agmarknet/sampleMarketDataService.js";
import { runIngestion } from "../src/services/ingestionService.js";
import { isValidDateString } from "../src/utils/dateUtils.js";
import { logger } from "../src/utils/logger.js";

function parseArgs(): { start: string; end: string; source: string } {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, "").split("=");
      return [key, value];
    })
  );
  const start = args.start;
  const end = args.end;
  const source = args.source || "agmarknet";

  if (!start || !end) {
    throw new Error("Usage: npm run backfill -- --start=YYYY-MM-DD --end=YYYY-MM-DD [--source=sample]");
  }
  if (!isValidDateString(start) || !isValidDateString(end)) {
    throw new Error("--start and --end must be valid YYYY-MM-DD dates");
  }
  if (start > end) {
    throw new Error("--start must not be after --end");
  }
  return { start, end, source };
}

async function main() {
  const { start, end, source: sourceName } = parseArgs();
  await connectToDatabase();

  const source = sourceName === "sample" ? new SampleMarketDataService() : new AgmarknetService();
  logger.info("Starting backfill", { start, end, source: source.sourceName });

  const result = await runIngestion(source, start, end, "BACKFILL");
  logger.info("Backfill finished", result as unknown as Record<string, unknown>);

  await closeDatabase();
}

main().catch((err) => {
  logger.error("Backfill script crashed", { error: (err as Error).message });
  process.exit(1);
});
