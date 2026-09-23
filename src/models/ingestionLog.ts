import type { ObjectId } from "mongodb";

export type IngestionMode =
  | "INITIAL_IMPORT"
  | "DAILY_SYNC"
  | "MANUAL_SYNC"
  | "BACKFILL"
  | "CSV_IMPORT";

export type IngestionStatus = "SUCCESS" | "PARTIAL" | "FAILED" | "NO_NEW_DATA";

export interface IngestionLog {
  _id?: ObjectId;
  startedAt: Date;
  completedAt: Date | null;
  status: IngestionStatus;
  source: string;
  mode: IngestionMode;
  startDate: string | null;
  endDate: string | null;
  pagesProcessed: number;
  recordsFound: number;
  recordsInserted: number;
  duplicatesSkipped: number;
  recordsFailed: number;
  ragDocumentsCreated: number;
  embeddingsCreated: number;
  errors: string[];
  durationMs: number | null;
}

export type NewIngestionLog = Omit<IngestionLog, "_id">;

export const INGESTION_LOGS_COLLECTION = "ingestion_logs";
