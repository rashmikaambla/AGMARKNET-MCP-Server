import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerAnalyzeMarketTrendPrompt(server: McpServer): void {
  server.registerPrompt(
    "analyze_market_trend",
    {
      title: "Analyze Market Trend",
      description: "Instructs the AI to analyze recent price movement for a commodity in a district.",
      argsSchema: {
        district: z.string().describe("District name, e.g. 'Anand'"),
        commodity: z.string().describe("Commodity name, e.g. 'Wheat'"),
        days: z.string().describe("Number of days to look back, e.g. '30'"),
      },
    },
    ({ district, commodity, days }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Analyze the AGMARKNET price trend for ${commodity} in ${district}, Gujarat over the last ${days} days.`,
              "",
              `1. Call the "get_price_trend" tool with commodity="${commodity}", district="${district}", days=${days}.`,
              '2. Call the "get_commodity_price" tool for the same range to get overall statistics.',
              "3. Summarize: recent price movement, highest and lowest prices, average price, and any notable",
              "   differences between markets within the district.",
              "4. Base every claim strictly on the tool results. Never invent numbers.",
              "5. Clearly state this is a historical observation, not a price prediction.",
              "6. Always cite the data source (AGMARKNET) and the date range covered.",
            ].join("\n"),
          },
        },
      ],
    })
  );
}
