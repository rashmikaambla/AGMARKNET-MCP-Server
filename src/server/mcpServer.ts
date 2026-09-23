import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { connectToDatabase } from "../services/mongodb.js";
import { registerAllTools } from "../tools/index.js";
import { registerAllResources } from "../resources/index.js";
import { registerAllPrompts } from "../prompts/index.js";
import { logger } from "../utils/logger.js";

async function main() {
  logger.info("Starting Gujarat AGMARKNET MCP server (stdio transport)");

  await connectToDatabase();

  const server = new McpServer({
    name: "gujarat-agmarknet-mcp",
    version: "1.0.0",
  });

  registerAllTools(server);
  registerAllResources(server);
  registerAllPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP server connected via stdio. Ready for MCP Inspector or an MCP client.");
}

main().catch((err) => {
  // Deliberately use console.error directly here: at this point the MCP
  // stdio transport owns stdout, and a crash before connection must still
  // be visible to whoever launched the process.
  console.error("Fatal error starting MCP server:", err);
  process.exit(1);
});
