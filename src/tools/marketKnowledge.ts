import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchMarketKnowledge } from "../services/ragService.js";
import { marketKnowledgeSchema, parseOrThrow } from "../utils/validation.js";
import { safeHandler } from "./toolResponse.js";

export function registerMarketKnowledgeTool(server: McpServer): void {
  server.registerTool(
    "search_market_knowledge",
    {
      title: "Search Market Knowledge (RAG)",
      description:
        "Semantic/RAG search over AGMARKNET market data converted to AI-readable documents. Use this for open-ended, contextual questions rather than exact numeric lookups (use the other tools for those).",
      inputSchema: {
        query: z.string().describe("Natural language question or search phrase"),
        district: z.string().optional(),
        market: z.string().optional(),
        commodity: z.string().optional(),
        startDate: z.string().optional().describe("YYYY-MM-DD"),
        endDate: z.string().optional().describe("YYYY-MM-DD"),
        topK: z.number().int().positive().max(50).optional().describe("Number of results to return (default 5)"),
      },
    },
    safeHandler(async (args) => {
      const input = parseOrThrow(marketKnowledgeSchema, args);
      const results = await searchMarketKnowledge(input);
      return { query: input.query, resultCount: results.length, results };
    })
  );
}
