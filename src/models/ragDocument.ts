import type { ObjectId } from "mongodb";

export interface RagDocumentMetadata {
  district: string;
  market: string;
  commodityGroup: string;
  commodity: string;
  variety: string | null;
  grade: string | null;
  date: string; // YYYY-MM-DD
  source: string;
  sourceUrl: string;
}

export interface RagDocument {
  _id?: ObjectId;
  documentId: string;
  marketDataRecordKey: string;
  content: string;
  embedding: number[];
  embeddingModel: string;
  metadata: RagDocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type NewRagDocument = Omit<RagDocument, "_id">;

export const RAG_DOCUMENTS_COLLECTION = "rag_documents";
