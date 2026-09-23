import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getStateMarketData } from "../services/marketDataService.js";
import { stateMarketDataSchema, parseOrThrow } from "../utils/validation.js";
import { safeHandler } from "./toolResponse.js";

export function registerStateMarketDataTool(server: McpServer): void {
  server.registerTool(
    "get_state_market_data",
    {
      title: "Get Gujarat State Market Data",
      description:
        "Returns Gujarat-wide AGMARKNET totals: districts, markets, commodities and price/arrival statistics for a date range.",
      inputSchema: {
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
      },
    },
    safeHandler(async (args) => {
      const input = parseOrThrow(stateMarketDataSchema, args);
      return getStateMarketData(input.startDate, input.endDate);
    })
  );
}
