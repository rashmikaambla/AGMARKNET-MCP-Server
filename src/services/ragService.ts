import { createHash } from "node:crypto";
import type { MarketData } from "../models/marketData.js";
import type { NewRagDocument } from "../models/ragDocument.js";
import { getEmbeddingService } from "./embeddingService.js";
import { upsertManyRagDocuments } from "../repositories/ragRepository.js";
import { semanticSearch, type ScoredRagDocument } from "./vectorSearchService.js";
import type { RagFilter } from "../repositories/ragRepository.js";
import { logger } from "../utils/logger.js";

/** Builds the natural-language content string for one market_data record. Uses only real DB values. */
export function buildRagContent(record: MarketData): string {
  const parts = [
    `AGMARKNET market data for ${record.market}, ${record.district}, Gujarat.`,
    `Date: ${record.arrivalDate}.`,
    `Commodity group: ${record.commodityGroup}.`,
    `Commodity: ${record.commodity}.`,
    record.variety ? `Variety: ${record.variety}.` : `Variety: not available.`,
    record.grade ? `Grade: ${record.grade}.` : `Grade: not available.`,
    record.minPrice !== null ? `Minimum price: ${record.minPrice} ${record.unit ?? ""}.` : `Minimum price: not available.`,
    record.maxPrice !== null ? `Maximum price: ${record.maxPrice} ${record.unit ?? ""}.` : `Maximum price: not available.`,
    record.modalPrice !== null ? `Modal price: ${record.modalPrice} ${record.unit ?? ""}.` : `Modal price: not available.`,
    record.arrivalQuantity !== null
      ? `Arrival quantity: ${record.arrivalQuantity} ${record.unit ?? ""}.`
      : `Arrival quantity: not available.`,
    `Source: ${record.source}.`,
    `Source URL: ${record.sourceUrl}.`,
  ];
  return parts.join(" ");
}

function buildDocumentId(recordKey: string): string {
  return createHash("sha1").update(`rag:${recordKey}`).digest("hex");
}

/** Generates and stores RAG documents (with embeddings) for a batch of market_data records. */
export async function createRagDocumentsForRecords(
  records: MarketData[]
): Promise<{ ragDocumentsCreated: number; embeddingsCreated: number }> {
  if (records.length === 0) return { ragDocumentsCreated: 0, embeddingsCreated: 0 };

  const embeddingService = getEmbeddingService();
  const contents = records.map(buildRagContent);
  const embeddings = await embeddingService.embedBatch(contents);

  const docs: NewRagDocument[] = records.map((record, i) => {
    const now = new Date();
    return {
      documentId: buildDocumentId(record.recordKey),
      marketDataRecordKey: record.recordKey,
      content: contents[i],
      embedding: embeddings[i],
      embeddingModel: embeddingService.modelName,
      metadata: {
        district: record.district,
        market: record.market,
        commodityGroup: record.commodityGroup,
        commodity: record.commodity,
        variety: record.variety,
        grade: record.grade,
        date: record.arrivalDate,
        source: record.source,
        sourceUrl: record.sourceUrl,
      },
      createdAt: now,
      updatedAt: now,
    };
  });

  const upserted = await upsertManyRagDocuments(docs);
  logger.info("RAG documents upserted", { count: upserted });
  return { ragDocumentsCreated: upserted, embeddingsCreated: embeddings.length };
}

export interface RagSearchInput {
  query: string;
  district?: string;
  market?: string;
  commodity?: string;
  startDate?: string;
  endDate?: string;
  topK?: number;
}

export async function searchMarketKnowledge(input: RagSearchInput): Promise<ScoredRagDocument[]> {
  const embeddingService = getEmbeddingService();
  const queryEmbedding = await embeddingService.embed(input.query);

  const filter: RagFilter = {
    district: input.district,
    market: input.market,
    commodity: input.commodity,
    startDate: input.startDate,
    endDate: input.endDate,
  };

  return semanticSearch(queryEmbedding, filter, input.topK ?? 5);
}
