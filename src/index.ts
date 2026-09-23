/**
 * Default entry point. Running `npm start` / `node dist/index.js` starts the
 * REST API server (and the daily sync scheduler alongside it).
 *
 * To run the MCP server for use with MCP Inspector or an MCP client, use
 * `npm run mcp` instead (see src/server/mcpServer.ts) — the MCP server uses
 * stdio transport and must be launched by the MCP client/inspector itself,
 * not run in the background like the REST server.
 */
import { startRestServer } from "./server/restServer.js";
import { logger } from "./utils/logger.js";

startRestServer().catch((err) => {
  logger.error("Fatal error starting server", { error: (err as Error).message });
  process.exit(1);
});
