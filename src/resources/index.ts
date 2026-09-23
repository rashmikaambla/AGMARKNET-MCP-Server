import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { findByFilters, distinctDistricts } from "../repositories/marketDataRepository.js";
import { listMarkets } from "../repositories/marketRepository.js";
import { getSystemMetadata } from "../repositories/metadataRepository.js";
import { latestIngestionLog } from "../repositories/ingestionRepository.js";
import { countAll } from "../repositories/marketDataRepository.js";
import { countRagDocuments } from "../repositories/ragRepository.js";
import { addDays, todayString } from "../utils/dateUtils.js";

function jsonContents(uri: URL, data: unknown) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * MCP resources expose READ-ONLY snapshots of already-stored information.
 * None of these trigger scraping — they only read from MongoDB, as required
 * (heavy scraping must never be started from a resource request).
 */
export function registerAllResources(server: McpServer): void {
  server.registerResource(
    "gujarat-market-data",
    "agmarknet://gujarat/market-data",
    {
      title: "Gujarat Market Data (recent snapshot)",
      description: "Most recent 7 days of stored Gujarat market data across all districts.",
      mimeType: "application/json",
    },
    async (uri) => {
      const endDate = todayString();
      const startDate = addDays(endDate, -7);
      const records = await findByFilters({
        state: process.env.AGMARKNET_STATE || "Gujarat",
        startDate,
        endDate,
      });
      return jsonContents(uri, { startDate, endDate, recordCount: records.length, records });
    }
  );

  server.registerResource(
    "gujarat-markets",
    "agmarknet://gujarat/markets",
    {
      title: "Gujarat Markets",
      description: "All markets discovered and stored from AGMARKNET (or sample) data.",
      mimeType: "application/json",
    },
    async (uri) => {
      const markets = await listMarkets();
      return jsonContents(uri, { count: markets.length, markets });
    }
  );

  server.registerResource(
    "gujarat-commodities",
    "agmarknet://gujarat/commodities",
    {
      title: "Gujarat Commodities",
      description: "Distinct commodities currently present in the stored dataset, grouped by district.",
      mimeType: "application/json",
    },
    async (uri) => {
      const districts = await distinctDistricts(process.env.AGMARKNET_STATE || "Gujarat");
      return jsonContents(uri, { districts });
    }
  );

  server.registerResource(
    "gujarat-data-status",
    "agmarknet://gujarat/data-status",
    {
      title: "Data Source Status",
      description: "Current ingestion/system status: last sync, total records, RAG index status.",
      mimeType: "application/json",
    },
    async (uri) => {
      const [metadata, lastLog, totalRecords] = await Promise.all([
        getSystemMetadata(),
        latestIngestionLog(),
        countAll(),
      ]);
      return jsonContents(uri, { metadata, lastIngestionLog: lastLog, totalRecords });
    }
  );

  server.registerResource(
    "gujarat-rag-knowledge",
    "agmarknet://gujarat/rag-knowledge",
    {
      title: "RAG Knowledge Base Status",
      description: "Summary of the RAG knowledge base: document count and embedding model in use.",
      mimeType: "application/json",
    },
    async (uri) => {
      const [ragDocumentCount, metadata] = await Promise.all([countRagDocuments(), getSystemMetadata()]);
      return jsonContents(uri, {
        ragDocumentCount,
        ragIndexStatus: metadata.ragIndexStatus,
        embeddingProvider: process.env.EMBEDDING_PROVIDER || "local",
        embeddingModel: process.env.EMBEDDING_MODEL || "local-hash-embedding-384",
        vectorSearchMode: process.env.VECTOR_SEARCH_MODE || "local",
      });
    }
  );
}
