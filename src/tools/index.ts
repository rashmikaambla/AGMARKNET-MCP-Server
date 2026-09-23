import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerDailyMarketDataTool } from "./dailyMarketData.js";
import { registerDistrictMarketDataTool } from "./districtMarketData.js";
import { registerStateMarketDataTool } from "./stateMarketData.js";
import { registerMarketDataTool } from "./marketData.js";
import { registerCommodityPriceTool } from "./commodityPrice.js";
import { registerPriceTrendTool } from "./priceTrend.js";
import { registerMarketListTool } from "./marketList.js";
import { registerMarketKnowledgeTool } from "./marketKnowledge.js";
import { registerMarketSummaryTool } from "./marketSummary.js";
import { registerDataSourceStatusTool } from "./dataSourceStatus.js";
import { registerMarketComparisonTool } from "./marketComparison.js";

export function registerAllTools(server: McpServer): void {
  registerDailyMarketDataTool(server);
  registerDistrictMarketDataTool(server);
  registerStateMarketDataTool(server);
  registerMarketDataTool(server);
  registerCommodityPriceTool(server);
  registerPriceTrendTool(server);
  registerMarketListTool(server);
  registerMarketKnowledgeTool(server);
  registerMarketSummaryTool(server);
  registerDataSourceStatusTool(server);
  registerMarketComparisonTool(server);
}
