import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getSystemMetadata } from "../repositories/metadataRepository.js";
import { latestIngestionLog } from "../repositories/ingestionRepository.js";
import { countAll } from "../repositories/marketDataRepository.js";
import { countRagDocuments } from "../repositories/ragRepository.js";
import { safeHandler } from "./toolResponse.js";

export function registerDataSourceStatusTool(server: McpServer): void {
  server.registerTool(
    "get_data_source_status",
    {
      title: "Get Data Source Status",
      description:
        "Returns AGMARKNET source info, last sync status, latest stored data date, total records, and RAG indexing status.",
      inputSchema: {},
    },
    safeHandler(async () => {
      const [metadata, lastLog, totalRecords, ragDocumentCount] = await Promise.all([
        getSystemMetadata(),
        latestIngestionLog(),
        countAll(),
        countRagDocuments(),
      ]);

      return {
        source: "AGMARKNET",
        sourceUrl: process.env.AGMARKNET_URL || "https://agmarknet.gov.in/home",
        lastSuccessfulSyncAt: metadata.lastSuccessfulSyncAt,
        lastSuccessfulDataDate: metadata.lastSuccessfulDataDate,
        lastAttemptedSyncAt: metadata.lastAttemptedSyncAt,
        lastSyncStatus: metadata.lastSyncStatus,
        totalRecords,
        ragDocumentCount,
        ragIndexStatus: metadata.ragIndexStatus,
        initialImportCompletedAt: metadata.initialImportCompletedAt,
        initialImportRange:
          metadata.initialImportStartDate && metadata.initialImportEndDate
            ? { startDate: metadata.initialImportStartDate, endDate: metadata.initialImportEndDate }
            : null,
        lastIngestionResult: lastLog,
        databaseStatus: "CONNECTED",
      };
    })
  );
}
