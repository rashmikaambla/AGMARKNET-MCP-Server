import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getDistrictMarketData } from "../services/marketDataService.js";
import { districtMarketDataSchema, parseOrThrow } from "../utils/validation.js";
import { safeHandler } from "./toolResponse.js";

export function registerDistrictMarketDataTool(server: McpServer): void {
  server.registerTool(
    "get_district_market_data",
    {
      title: "Get District Market Data",
      description:
        "Returns market-wise and commodity-wise AGMARKNET data for a district over a date range, with summary price statistics.",
      inputSchema: {
        district: z.string().describe("District name, e.g. 'Anand'"),
        startDate: z.string().describe("Start date in YYYY-MM-DD format"),
        endDate: z.string().describe("End date in YYYY-MM-DD format"),
      },
    },
    safeHandler(async (args) => {
      const input = parseOrThrow(districtMarketDataSchema, args);
      return getDistrictMarketData(input.district, input.startDate, input.endDate);
    })
  );
}
