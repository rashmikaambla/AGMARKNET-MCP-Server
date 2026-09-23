import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDailyMarketData } from "../services/marketDataService.js";
import { dailyMarketDataSchema, parseOrThrow } from "../utils/validation.js";
import { safeHandler } from "./toolResponse.js";

export function registerDailyMarketDataTool(server: McpServer): void {
  server.registerTool(
    "get_daily_market_data",
    {
      title: "Get Daily Market Data",
      description:
        "Returns AGMARKNET market prices and arrivals for a specific Gujarat district on a specific date.",
      inputSchema: {
        district: z.string().describe("District name, e.g. 'Anand'"),
        date: z.string().describe("Date in YYYY-MM-DD format"),
      },
    },
    safeHandler(async (args) => {
      const input = parseOrThrow(dailyMarketDataSchema, args);
      return getDailyMarketData(input.district, input.date);
    })
  );
}
