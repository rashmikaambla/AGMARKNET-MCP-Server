import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMarketSummary } from "../services/marketDataService.js";
import { marketSummarySchema, parseOrThrow } from "../utils/validation.js";
import { safeHandler } from "./toolResponse.js";

export function registerMarketSummaryTool(server: McpServer): void {
  server.registerTool(
    "get_market_summary",
    {
      title: "Get Market Summary",
      description:
        "Generates a structured 30-day summary for a district: major markets, available commodities, and price ranges, from stored data only.",
      inputSchema: {
        district: z.string().describe("District name, e.g. 'Anand'"),
      },
    },
    safeHandler(async (args) => {
      const input = parseOrThrow(marketSummarySchema, args);
      return getMarketSummary(input.district);
    })
  );
}
