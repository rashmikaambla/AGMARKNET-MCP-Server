import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerGenerateMarketReportPrompt(server: McpServer): void {
  server.registerPrompt(
    "generate_market_report",
    {
      title: "Generate Market Report",
      description: "Instructs the AI to produce a structured agricultural market report for a district and date range.",
      argsSchema: {
        district: z.string().describe("District name, e.g. 'Anand'"),
        startDate: z.string().describe("Start date, YYYY-MM-DD"),
        endDate: z.string().describe("End date, YYYY-MM-DD"),
      },
    },
    ({ district, startDate, endDate }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Generate a structured AGMARKNET market report for ${district}, Gujarat, covering ${startDate} to ${endDate}.`,
              "",
              `1. Call "get_district_market_data" with district="${district}", startDate="${startDate}", endDate="${endDate}".`,
              '2. Call "get_market_summary" for the district for additional context.',
              "3. Structure the report with these sections: Overview, Markets Covered, Commodities Covered,",
              "   Price Statistics (min/max/average modal price), Notable Observations, Data Source & Limitations.",
              "4. Use only values returned by the tools. If data is missing for part of the range, say so explicitly",
              "   rather than filling gaps with assumptions.",
              "5. End the report with the source (AGMARKNET) and source URL.",
            ].join("\n"),
          },
        },
      ],
    })
  );
}
