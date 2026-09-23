import { getDb } from "../services/mongodb.js";
import {
  SYSTEM_METADATA_COLLECTION,
  defaultSystemMetadata,
  type SystemMetadata,
} from "../models/systemMetadata.js";

function collection() {
  return getDb().collection<SystemMetadata>(SYSTEM_METADATA_COLLECTION);
}

export async function getSystemMetadata(): Promise<SystemMetadata> {
  const existing = await collection().findOne({ key: "singleton" });
  if (existing) return existing;
  const created = defaultSystemMetadata();
  await collection().insertOne(created);
  return created;
}

export async function updateSystemMetadata(update: Partial<SystemMetadata>): Promise<void> {
  await collection().updateOne(
    { key: "singleton" },
    { $set: { ...update, updatedAt: new Date() } },
    { upsert: true }
  );
}
