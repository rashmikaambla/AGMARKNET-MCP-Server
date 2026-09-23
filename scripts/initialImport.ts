/**
 * npm run initial-import
 *
 * One-time historical import. For 08-09-2026 this imports:
 *   08-09-2025 through 07-09-2026
 *
 * The data is append-only. Re-running the script is duplicate-safe.
 */
import "dotenv/config";
import { connectToDatabase, closeDatabase } from "../src/services/mongodb.js";
import { AgmarknetService } from "../src/services/agmarknet/agmarknetService.js";
import { runIngestion } from "../src/services/ingestionService.js";
import {
  updateSystemMetadata,
  getSystemMetadata,
} from "../src/repositories/metadataRepository.js";
import { subtractDays, todayString } from "../src/utils/dateUtils.js";
import { logger } from "../src/utils/logger.js";

async function main() {
  await connectToDatabase();

  const metadata = await getSystemMetadata();
  if (metadata.initialImportCompletedAt) {
    logger.info("Initial import already completed previously", {
      completedAt: metadata.initialImportCompletedAt,
      range: [metadata.initialImportStartDate, metadata.initialImportEndDate],
    });
    await closeDatabase();
    return;
  }

  const source = new AgmarknetService();
  const historyYears = Number(process.env.INITIAL_HISTORY_YEARS || 1);

  const endDate = subtractDays(todayString(), 1);
  const totalDays = historyYears * 365;
  const startDate = subtractDays(endDate, totalDays - 1);

  logger.info("Starting initial historical import", {
    startDate,
    endDate,
    historyYears,
  });

  const result = await runIngestion(source, startDate, endDate, "INITIAL_IMPORT");

  // Do NOT mark the initial import as completed when the live scraper fails.
  // It should be possible to fix selectors/CAPTCHA/site issues and retry.
  if (result.status !== "FAILED") {
    await updateSystemMetadata({
      initialImportStartDate: startDate,
      initialImportEndDate: endDate,
      initialImportCompletedAt: new Date(),
    });
  }

  logger.info("Initial import finished", result as unknown as Record<string, unknown>);

  if (result.status === "FAILED") {
    logger.warn(
      "Initial import failed. Existing database data was not deleted. Fix the AGMARKNET scraper and run npm run initial-import again."
    );
  }

  await closeDatabase();
}

main().catch((err) => {
  logger.error("Initial import script crashed", { error: (err as Error).message });
  process.exit(1);
});
