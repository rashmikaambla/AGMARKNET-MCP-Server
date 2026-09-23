import {
  findCandidatesForLocalSearch,
  vectorSearchAtlas,
  type RagFilter,
} from "../repositories/ragRepository.js";
import type { RagDocument } from "../models/ragDocument.js";
import { logger } from "../utils/logger.js";

export interface ScoredRagDocument {
  documentId: string;
  content: string;
  score: number;
  metadata: RagDocument["metadata"];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Isolates vector-search implementation from MCP tools / controllers.
 * VECTOR_SEARCH_MODE=local performs brute-force cosine similarity over
 * candidate documents fetched from MongoDB (fine for a college-project
 * scale dataset, and requires zero extra infrastructure).
 * VECTOR_SEARCH_MODE=atlas delegates to MongoDB Atlas Vector Search.
 */
export async function semanticSearch(
  queryEmbedding: number[],
  filter: RagFilter,
  topK: number
): Promise<ScoredRagDocument[]> {
  const mode = (process.env.VECTOR_SEARCH_MODE || "local").toLowerCase();

  if (mode === "atlas") {
    const indexName = process.env.MONGODB_VECTOR_INDEX || "rag_vector_index";
    const results = await vectorSearchAtlas(queryEmbedding, filter, topK, indexName);
    return results.map((r) => ({
      documentId: r.documentId,
      content: r.content,
      score: r.score,
      metadata: r.metadata,
    }));
  }

  logger.debug("Running local cosine-similarity vector search");
  const candidates = await findCandidatesForLocalSearch(filter);
  const scored = candidates.map((doc) => ({
    documentId: doc.documentId,
    content: doc.content,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
    metadata: doc.metadata,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
