import { getDb } from "../services/mongodb.js";
import { RAG_DOCUMENTS_COLLECTION, type NewRagDocument, type RagDocument } from "../models/ragDocument.js";

function collection() {
  return getDb().collection<RagDocument>(RAG_DOCUMENTS_COLLECTION);
}

/** Upsert-by-source-record so re-running embeddings never duplicates a RAG document. */
export async function upsertRagDocument(doc: NewRagDocument): Promise<void> {
  await collection().updateOne(
    { marketDataRecordKey: doc.marketDataRecordKey },
    { $set: doc },
    { upsert: true }
  );
}

export async function upsertManyRagDocuments(docs: NewRagDocument[]): Promise<number> {
  if (docs.length === 0) return 0;
  const bulk = collection().initializeUnorderedBulkOp();
  for (const doc of docs) {
    bulk
      .find({ marketDataRecordKey: doc.marketDataRecordKey })
      .upsert()
      .updateOne({ $set: doc });
  }
  const result = await bulk.execute();
  return result.upsertedCount + result.modifiedCount;
}

export interface RagFilter {
  district?: string;
  market?: string;
  commodity?: string;
  startDate?: string;
  endDate?: string;
}

function buildMetadataFilter(filter: RagFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  if (filter.district) query["metadata.district"] = filter.district;
  if (filter.market) query["metadata.market"] = filter.market;
  if (filter.commodity) query["metadata.commodity"] = filter.commodity;
  if (filter.startDate || filter.endDate) {
    const range: Record<string, string> = {};
    if (filter.startDate) range.$gte = filter.startDate;
    if (filter.endDate) range.$lte = filter.endDate;
    query["metadata.date"] = range;
  }
  return query;
}

/** Fetches candidate documents for local (in-app) cosine-similarity vector search. */
export async function findCandidatesForLocalSearch(filter: RagFilter, limit = 5000): Promise<RagDocument[]> {
  return collection().find(buildMetadataFilter(filter)).limit(limit).toArray();
}

/** MongoDB Atlas Vector Search using the $vectorSearch aggregation stage. */
export async function vectorSearchAtlas(
  queryEmbedding: number[],
  filter: RagFilter,
  topK: number,
  indexName: string
): Promise<Array<RagDocument & { score: number }>> {
  const pipeline: Record<string, unknown>[] = [
    {
      $vectorSearch: {
        index: indexName,
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: Math.max(100, topK * 20),
        limit: topK,
        filter: buildMetadataFilter(filter),
      },
    },
    {
      $project: {
        documentId: 1,
        marketDataRecordKey: 1,
        content: 1,
        metadata: 1,
        embeddingModel: 1,
        createdAt: 1,
        updatedAt: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];
  return collection().aggregate<RagDocument & { score: number }>(pipeline).toArray();
}

export async function countRagDocuments(): Promise<number> {
  return collection().countDocuments();
}
