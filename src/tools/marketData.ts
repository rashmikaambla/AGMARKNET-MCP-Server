import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMarketData } from "../services/marketDataService.js";
import { marketDataSchema, parseOrThrow } from "../utils/validation.js";
import { safeHandler } from "./toolResponse.js";

export function registerMarketDataTool(server: McpServer): void {
  server.registerTool(
    "get_market_data",
    {
      title: "Get Market-Specific Data",
      description: "Returns AGMARKNET data for one specific market, optionally filtered by commodity and date range.",
      inputSchema: {
        market: z.string().describe("Market name, e.g. 'Anand'"),
        startDate: z.string().optional().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().optional().describe("End date in YYYY-MM-DD format"),
        commodity: z.string().optional().describe("Commodity name, e.g. 'Wheat'"),
      },
    },
    safeHandler(async (args) => {
      const input = parseOrThrow(marketDataSchema, args);
      return getMarketData(input.market, input.startDate, input.endDate, input.commodity);
    })
  );
}
