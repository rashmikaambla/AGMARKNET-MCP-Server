import type { ObjectId } from "mongodb";

export interface SystemMetadata {
  _id?: ObjectId;
  key: "singleton";
  initialImportStartDate: string | null;
  initialImportEndDate: string | null;
  initialImportCompletedAt: Date | null;
  lastSuccessfulSyncAt: Date | null;
  lastSuccessfulDataDate: string | null;
  lastAttemptedSyncAt: Date | null;
  lastSyncStatus: string | null;
  totalRecords: number;
  ragIndexStatus: "NOT_BUILT" | "BUILDING" | "READY";
  updatedAt: Date;
}

export const SYSTEM_METADATA_COLLECTION = "system_metadata";

export function defaultSystemMetadata(): SystemMetadata {
  return {
    key: "singleton",
    initialImportStartDate: null,
    initialImportEndDate: null,
    initialImportCompletedAt: null,
    lastSuccessfulSyncAt: null,
    lastSuccessfulDataDate: null,
    lastAttemptedSyncAt: null,
    lastSyncStatus: null,
    totalRecords: 0,
    ragIndexStatus: "NOT_BUILT",
    updatedAt: new Date(),
  };
}
