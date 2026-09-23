import { getDb } from "../services/mongodb.js";
import {
  INGESTION_LOGS_COLLECTION,
  type IngestionLog,
  type NewIngestionLog,
} from "../models/ingestionLog.js";
import type { ObjectId } from "mongodb";

function collection() {
  return getDb().collection<IngestionLog>(INGESTION_LOGS_COLLECTION);
}

export async function createIngestionLog(log: NewIngestionLog): Promise<ObjectId> {
  const result = await collection().insertOne(log as IngestionLog);
  return result.insertedId;
}

export async function completeIngestionLog(
  id: ObjectId,
  update: Partial<IngestionLog>
): Promise<void> {
  await collection().updateOne({ _id: id }, { $set: update });
}

export async function latestIngestionLog(): Promise<IngestionLog | null> {
  const [log] = await collection().find({}).sort({ startedAt: -1 }).limit(1).toArray();
  return log ?? null;
}

export async function recentIngestionLogs(limit = 10): Promise<IngestionLog[]> {
  return collection().find({}).sort({ startedAt: -1 }).limit(limit).toArray();
}
