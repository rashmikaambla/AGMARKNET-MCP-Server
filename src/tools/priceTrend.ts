import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPriceTrend } from "../services/marketDataService.js";
import { priceTrendSchema, parseOrThrow } from "../utils/validation.js";
import { safeHandler } from "./toolResponse.js";

export function registerPriceTrendTool(server: McpServer): void {
  server.registerTool(
    "get_price_trend",
    {
      title: "Get Price Trend",
      description:
        "Returns the day-by-day price trend for a commodity over the last N days, based purely on stored historical data (never a prediction).",
      inputSchema: {
        commodity: z.string().describe("Commodity name, e.g. 'Wheat'"),
        district: z.string().optional(),
        market: z.string().optional(),
        days: z.number().int().positive().describe("Number of days to look back from today"),
      },
    },
    safeHandler(async (args) => {
      const input = parseOrThrow(priceTrendSchema, args);
      return getPriceTrend(input.commodity, input.days, input.district, input.market);
    })
  );
}
