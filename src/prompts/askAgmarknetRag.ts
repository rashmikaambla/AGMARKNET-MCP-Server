import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerAskAgmarknetRagPrompt(server: McpServer): void {
  server.registerPrompt(
    "ask_agmarknet_rag",
    {
      title: "Ask AGMARKNET (RAG)",
      description: "Instructs the AI to answer a free-form question using RAG search over stored AGMARKNET knowledge.",
      argsSchema: {
        question: z.string().describe("The user's natural-language question about Gujarat agricultural markets"),
      },
    },
    ({ question }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Answer this question using the AGMARKNET knowledge base: "${question}"`,
              "",
              '1. Call the "search_market_knowledge" tool with query set to the question above.',
              "2. Read the retrieved documents and their metadata carefully.",
              "3. Answer using ONLY the retrieved data. Never invent missing values.",
              "4. In your answer, explicitly mention: the relevant date(s), district, market, and commodity.",
              "5. Mention the data source (AGMARKNET) and its source URL.",
              "6. Clearly separate values taken directly from source records from any statistics you calculate",
              "   (e.g. an average across several records).",
              "7. If the retrieved documents do not contain enough information to answer confidently, say so",
              "   explicitly instead of guessing.",
            ].join("\n"),
          },
        },
      ],
    })
  );
}
