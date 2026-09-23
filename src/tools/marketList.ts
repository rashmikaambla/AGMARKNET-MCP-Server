import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMarketList } from "../services/marketDataService.js";
import { marketListSchema, parseOrThrow } from "../utils/validation.js";
import { safeHandler } from "./toolResponse.js";

export function registerMarketListTool(server: McpServer): void {
  server.registerTool(
    "get_market_list",
    {
      title: "Get Market List",
      description: "Returns the list of markets actually discovered and stored from AGMARKNET data, optionally filtered by district.",
      inputSchema: {
        district: z.string().optional().describe("District name to filter markets by"),
      },
    },
    safeHandler(async (args) => {
      const input = parseOrThrow(marketListSchema, args);
      return getMarketList(input.district);
    })
  );
}
