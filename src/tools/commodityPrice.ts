import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getCommodityPrice } from "../services/marketDataService.js";
import { commodityPriceSchema, parseOrThrow } from "../utils/validation.js";
import { safeHandler } from "./toolResponse.js";

export function registerCommodityPriceTool(server: McpServer): void {
  server.registerTool(
    "get_commodity_price",
    {
      title: "Get Commodity Price Statistics",
      description:
        "Calculates minimum/maximum/average/modal price statistics and a historical trend for a commodity over a date range.",
      inputSchema: {
        commodity: z.string().describe("Commodity name, e.g. 'Wheat'"),
        district: z.string().optional(),
        market: z.string().optional(),
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
      },
    },
    safeHandler(async (args) => {
      const input = parseOrThrow(commodityPriceSchema, args);
      return getCommodityPrice(input.commodity, input.startDate, input.endDate, input.district, input.market);
    })
  );
}
