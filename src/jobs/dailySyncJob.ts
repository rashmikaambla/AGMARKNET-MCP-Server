import cron from "node-cron";
import { runIngestion } from "../services/ingestionService.js";
import { AgmarknetService } from "../services/agmarknet/agmarknetService.js";
import { subtractDays, todayString } from "../utils/dateUtils.js";
import { logger } from "../utils/logger.js";

let scheduledTask: ReturnType<typeof cron.schedule> | null = null;

/**
 * Fetch ONLY yesterday's AGMARKNET data.
 *
 * Example:
 *   08-09-2026 at 21:00 -> fetch 07-09-2026
 *
 * Existing records are never deleted. If AGMARKNET returns no rows for
 * yesterday, ingestion returns NO_NEW_DATA and nothing is inserted.
 */
export async function runDailySync(): Promise<void> {
  const yesterday = subtractDays(todayString(), 1);

  logger.info("Daily sync job triggered", { date: yesterday });

  const source = new AgmarknetService();
  const result = await runIngestion(source, yesterday, yesterday, "DAILY_SYNC");

  if (result.status === "NO_NEW_DATA") {
    logger.info("No AGMARKNET data available for yesterday. Nothing stored.", {
      date: yesterday,
    });
    return;
  }

  if (result.status === "FAILED") {
    logger.warn("Daily sync could not fetch yesterday's data. Existing data was not deleted.", {
      date: yesterday,
      errors: result.errors,
    });
    return;
  }

  logger.info("Daily sync job finished", {
    date: yesterday,
    status: result.status,
    inserted: result.recordsInserted,
    duplicates: result.duplicatesSkipped,
  });
}

/** Registers the optional in-process cron schedule. */
export function startDailySyncJob(): void {
  const expression = process.env.DATA_SYNC_CRON || "0 21 * * *";

  if (!cron.validate(expression)) {
    logger.warn("Invalid DATA_SYNC_CRON expression; daily sync job NOT scheduled", {
      expression,
    });
    return;
  }

  if (scheduledTask) scheduledTask.stop();

  scheduledTask = cron.schedule(expression, () => {
    runDailySync().catch((err) => {
      logger.error("Daily sync job crashed", { error: (err as Error).message });
    });
  });

  logger.info("Daily sync job scheduled", { cron: expression });
}

export function stopDailySyncJob(): void {
  scheduledTask?.stop();
  scheduledTask = null;
}
