import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAnalyzeMarketTrendPrompt } from "./analyzeMarketTrend.js";
import { registerGenerateMarketReportPrompt } from "./generateMarketReport.js";
import { registerAskAgmarknetRagPrompt } from "./askAgmarknetRag.js";

export function registerAllPrompts(server: McpServer): void {
  registerAnalyzeMarketTrendPrompt(server);
  registerGenerateMarketReportPrompt(server);
  registerAskAgmarknetRagPrompt(server);
}
