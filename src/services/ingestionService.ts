import {
  normalizeMarketRow,
  NormalizationError,
} from "../utils/normalization.js";

import { insertManyIfNotExists } from "../repositories/marketDataRepository.js";
import { upsertMarket } from "../repositories/marketRepository.js";

import {
  createIngestionLog,
  completeIngestionLog,
} from "../repositories/ingestionRepository.js";

import {
  updateSystemMetadata,
  getSystemMetadata,
} from "../repositories/metadataRepository.js";

import { createRagDocumentsForRecords } from "./ragService.js";

import { getConfiguredFilters } from "./agmarknet/selectors.js";

import type { MarketDataSource } from "./agmarknet/marketDataSource.js";
import type { IngestionMode } from "../models/ingestionLog.js";

import { logger } from "../utils/logger.js";

import { countAll } from "../repositories/marketDataRepository.js";

export interface IngestionResult {
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "NO_NEW_DATA";

  pagesProcessed: number;
  recordsFound: number;
  recordsInserted: number;
  duplicatesSkipped: number;
  recordsFailed: number;

  ragDocumentsCreated: number;
  embeddingsCreated: number;

  errors: string[];
  durationMs: number;
}

/**
 * Shared ingestion pipeline.
 *
 * Used by:
 * - initial import
 * - daily sync
 * - manual sync
 * - historical backfill
 *
 * IMPORTANT:
 * This function is APPEND ONLY.
 * Existing market_data records are NEVER deleted.
 */
export async function runIngestion(
  source: MarketDataSource,
  startDate: string,
  endDate: string,
  mode: IngestionMode
): Promise<IngestionResult> {
  const startedAt = new Date();

  const filters = getConfiguredFilters();

  const errors: string[] = [];

  let pagesProcessed = 0;
  let recordsFound = 0;
  let recordsInserted = 0;
  let duplicatesSkipped = 0;
  let recordsFailed = 0;
  let ragDocumentsCreated = 0;
  let embeddingsCreated = 0;

  const logId = await createIngestionLog({
    startedAt,
    completedAt: null,
    status: "SUCCESS",

    source: source.sourceName,
    mode,

    startDate,
    endDate,

    pagesProcessed: 0,
    recordsFound: 0,
    recordsInserted: 0,
    duplicatesSkipped: 0,
    recordsFailed: 0,

    ragDocumentsCreated: 0,
    embeddingsCreated: 0,

    errors: [],
    durationMs: null,
  });

  await updateSystemMetadata({
    lastAttemptedSyncAt: startedAt,
  });

  try {
    logger.info("Ingestion started", {
      source: source.sourceName,
      mode,
      startDate,
      endDate,
    });

    // ---------------------------------------------------------
    // 1. FETCH RAW DATA
    // ---------------------------------------------------------

    const result = await source.fetchHistoricalData(
      startDate,
      endDate,
      filters
    );

    const rows = result.rows;

    pagesProcessed = result.pagesProcessed;
    recordsFound = rows.length;

    logger.info("Ingestion: raw rows fetched", {
      count: rows.length,
      pagesProcessed,
    });

    // ---------------------------------------------------------
    // 2. NO DATA
    // ---------------------------------------------------------

    if (rows.length === 0) {
      const durationMs = Date.now() - startedAt.getTime();

      await completeIngestionLog(logId, {
        completedAt: new Date(),

        status: "NO_NEW_DATA",

        pagesProcessed,
        recordsFound: 0,

        recordsInserted: 0,
        duplicatesSkipped: 0,
        recordsFailed: 0,

        ragDocumentsCreated: 0,
        embeddingsCreated: 0,

        errors: [],

        durationMs,
      });

      await updateSystemMetadata({
        lastSyncStatus: "NO_NEW_DATA",
      });

      logger.info("No new AGMARKNET data available", {
        startDate,
        endDate,
      });

      return {
        status: "NO_NEW_DATA",

        pagesProcessed,
        recordsFound: 0,

        recordsInserted: 0,
        duplicatesSkipped: 0,
        recordsFailed: 0,

        ragDocumentsCreated: 0,
        embeddingsCreated: 0,

        errors: [],

        durationMs,
      };
    }

    // ---------------------------------------------------------
    // 3. NORMALIZE RAW ROWS
    // ---------------------------------------------------------

    const normalized = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        const record = normalizeMarketRow(
          row,
          source.sourceName,
          source.sourceUrl
        );

        normalized.push(record);
      } catch (err) {
        recordsFailed++;

        const message =
          err instanceof Error
            ? err.message
            : String(err);

        const errorMessage =
          `Row ${i + 1} normalization failed: ${message}`;

        errors.push(errorMessage);

        // Log first 10 complete failures so we can debug
        // without flooding the terminal.
        if (recordsFailed <= 10) {
          logger.error(
            "AGMARKNET row normalization failed",
            {
              rowNumber: i + 1,
              error: message,
              rawRow: row,
            }
          );
        }
      }
    }

    logger.info("Normalization completed", {
      recordsFound: rows.length,
      normalized: normalized.length,
      failed: recordsFailed,
    });

    // ---------------------------------------------------------
    // 4. IF ALL ROWS FAILED
    // ---------------------------------------------------------

    if (normalized.length === 0) {
      const durationMs = Date.now() - startedAt.getTime();

      logger.error(
        "All scraped rows failed normalization",
        {
          recordsFound: rows.length,
          recordsFailed,
          firstErrors: errors.slice(0, 10),
        }
      );

      await completeIngestionLog(logId, {
        completedAt: new Date(),

        status: "PARTIAL",

        pagesProcessed,
        recordsFound,

        recordsInserted: 0,
        duplicatesSkipped: 0,
        recordsFailed,

        ragDocumentsCreated: 0,
        embeddingsCreated: 0,

        errors: errors.slice(0, 50),

        durationMs,
      });

      await updateSystemMetadata({
        lastSyncStatus: "PARTIAL",
      });

      return {
        status: "PARTIAL",

        pagesProcessed,
        recordsFound,

        recordsInserted: 0,
        duplicatesSkipped: 0,
        recordsFailed,

        ragDocumentsCreated: 0,
        embeddingsCreated: 0,

        errors,

        durationMs,
      };
    }

    // ---------------------------------------------------------
    // 5. INSERT INTO MARKET_DATA
    // ---------------------------------------------------------

    logger.info("Inserting normalized records", {
      count: normalized.length,
    });

    const insertResult = await insertManyIfNotExists(
      normalized
    );

    recordsInserted = insertResult.inserted;
    duplicatesSkipped = insertResult.duplicates;

    recordsFailed += insertResult.failed;

    logger.info("Market data insertion completed", {
      inserted: insertResult.inserted,
      duplicates: insertResult.duplicates,
      failed: insertResult.failed,
    });

    // ---------------------------------------------------------
    // 6. UPDATE MARKETS COLLECTION
    // ---------------------------------------------------------

    for (const record of insertResult.insertedRecords) {
      try {
        await upsertMarket({
          state: record.state,
          district: record.district,
          market: record.market,

          source: record.source,
          sourceUrl: record.sourceUrl,
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : String(err);

        errors.push(
          `Market upsert failed for ${record.market}: ${message}`
        );

        logger.error("Market upsert failed", {
          market: record.market,
          error: message,
        });
      }
    }

    // ---------------------------------------------------------
    // 7. CREATE RAG DOCUMENTS
    // ---------------------------------------------------------

    let ragResult = {
      ragDocumentsCreated: 0,
      embeddingsCreated: 0,
    };

    if (insertResult.insertedRecords.length > 0) {
      try {
        ragResult = await createRagDocumentsForRecords(
          insertResult.insertedRecords
        );

        ragDocumentsCreated =
          ragResult.ragDocumentsCreated;

        embeddingsCreated =
          ragResult.embeddingsCreated;

        logger.info("RAG indexing completed", {
          ragDocumentsCreated,
          embeddingsCreated,
        });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : String(err);

        errors.push(
          `RAG indexing failed: ${message}`
        );

        logger.error("RAG indexing failed", {
          error: message,
        });
      }
    }

    // ---------------------------------------------------------
    // 8. UPDATE SYSTEM METADATA
    // ---------------------------------------------------------

    const totalRecords = await countAll();

    const metadata = await getSystemMetadata();

    let latestDate =
      metadata.lastSuccessfulDataDate;

    if (insertResult.insertedRecords.length > 0) {
      latestDate =
        insertResult.insertedRecords
          .map((record) => record.arrivalDate)
          .sort()
          .at(-1) ??
        metadata.lastSuccessfulDataDate;
    }

    // ---------------------------------------------------------
    // 9. DETERMINE STATUS
    // ---------------------------------------------------------

    let status:
      | "SUCCESS"
      | "PARTIAL"
      | "NO_NEW_DATA";

    if (
      recordsInserted === 0 &&
      duplicatesSkipped > 0 &&
      recordsFailed === 0
    ) {
      status = "NO_NEW_DATA";
    } else if (
      recordsFailed > 0 ||
      insertResult.failed > 0 ||
      errors.length > 0
    ) {
      status = "PARTIAL";
    } else {
      status = "SUCCESS";
    }

    // ---------------------------------------------------------
    // 10. UPDATE METADATA
    // ---------------------------------------------------------

    await updateSystemMetadata({
      lastSuccessfulSyncAt: new Date(),

      lastSuccessfulDataDate: latestDate,

      lastSyncStatus: status,

      totalRecords,

      ragIndexStatus: "READY",
    });

    // ---------------------------------------------------------
    // 11. COMPLETE INGESTION LOG
    // ---------------------------------------------------------

    const durationMs =
      Date.now() - startedAt.getTime();

    await completeIngestionLog(logId, {
      completedAt: new Date(),

      status,

      pagesProcessed,
      recordsFound,

      recordsInserted,
      duplicatesSkipped,
      recordsFailed,

      ragDocumentsCreated,
      embeddingsCreated,

      errors: errors.slice(0, 50),

      durationMs,
    });

    // ---------------------------------------------------------
    // 12. FINAL LOG
    // ---------------------------------------------------------

    logger.info("Ingestion completed", {
      status,

      pagesProcessed,

      recordsFound,

      inserted: recordsInserted,

      duplicates: duplicatesSkipped,

      failed: recordsFailed,

      ragDocumentsCreated,

      embeddingsCreated,

      totalRecords,
    });

    // ---------------------------------------------------------
    // 13. RETURN RESULT
    // ---------------------------------------------------------

    return {
      status,

      pagesProcessed,

      recordsFound,

      recordsInserted,

      duplicatesSkipped,

      recordsFailed,

      ragDocumentsCreated,

      embeddingsCreated,

      errors,

      durationMs,
    };
  } catch (err) {
    // ---------------------------------------------------------
    // COMPLETE PIPELINE FAILURE
    // ---------------------------------------------------------

    const durationMs =
      Date.now() - startedAt.getTime();

    const message =
      err instanceof Error
        ? err.message
        : String(err);

    errors.push(message);

    logger.error("Ingestion failed", {
      error: message,

      source: source.sourceName,

      startDate,

      endDate,
    });

    await completeIngestionLog(logId, {
      completedAt: new Date(),

      status: "FAILED",

      pagesProcessed,

      recordsFound,

      recordsInserted,

      duplicatesSkipped,

      recordsFailed,

      ragDocumentsCreated,

      embeddingsCreated,

      errors: errors.slice(0, 50),

      durationMs,
    });

    await updateSystemMetadata({
      lastSyncStatus: "FAILED",
    });

    return {
      status: "FAILED",

      pagesProcessed,

      recordsFound,

      recordsInserted,

      duplicatesSkipped,

      recordsFailed,

      ragDocumentsCreated,

      embeddingsCreated,

      errors,

      durationMs,
    };
  }
}