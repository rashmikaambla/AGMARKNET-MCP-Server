import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ValidationError } from "../utils/validation.js";
import { logger } from "../utils/logger.js";

const AGMARKNET_URL = () => process.env.AGMARKNET_URL || "https://agmarknet.gov.in/home";

export function successResult(data: unknown, extraMetadata: Record<string, unknown> = {}): CallToolResult {
  const payload = {
    success: true,
    data,
    metadata: {
      source: "AGMARKNET",
      sourceUrl: AGMARKNET_URL(),
      generatedAt: new Date().toISOString(),
      ...extraMetadata,
    },
  };
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

export function errorResult(error: unknown): CallToolResult {
  const message = error instanceof Error ? error.message : String(error);
  const issues = error instanceof ValidationError ? error.issues : undefined;
  logger.warn("Tool execution error", { message, issues });

  const payload = {
    success: false,
    error: {
      message,
      ...(issues ? { issues } : {}),
    },
  };
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    isError: true,
  };
}

/** Wraps a tool handler with consistent try/catch -> structured error response. */
export function safeHandler<T extends (...args: any[]) => Promise<unknown>>(
  fn: T
): (...args: Parameters<T>) => Promise<CallToolResult> {
  return async (...args: Parameters<T>) => {
    try {
      const data = await fn(...args);
      return successResult(data);
    } catch (err) {
      return errorResult(err);
    }
  };
}
