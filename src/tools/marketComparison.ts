import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMarketComparison } from "../services/marketDataService.js";
import { marketComparisonSchema, parseOrThrow } from "../utils/validation.js";
import { safeHandler } from "./toolResponse.js";

export function registerMarketComparisonTool(server: McpServer): void {
  server.registerTool(
    "get_market_comparison",
    {
      title: "Compare Markets",
      description:
        "Compares price statistics for a commodity across two or more markets over a date range, identifying the highest/lowest average markets.",
      inputSchema: {
        commodity: z.string().describe("Commodity name, e.g. 'Wheat'"),
        markets: z.array(z.string()).min(2).describe("List of at least two market names to compare"),
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
      },
    },
    safeHandler(async (args) => {
      const input = parseOrThrow(marketComparisonSchema, args);
      return getMarketComparison(input.commodity, input.markets, input.startDate, input.endDate);
    })
  );
}
