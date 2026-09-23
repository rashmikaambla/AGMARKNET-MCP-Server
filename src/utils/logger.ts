/**
 * Minimal structured logger.
 * - Never logs secrets (API keys, passwords, connection strings with credentials).
 * - Respects LOG_LEVEL from env: DEBUG < INFO < WARN < ERROR.
 */

type Level = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_ORDER: Record<Level, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

function currentThreshold(): number {
  const configured = (process.env.LOG_LEVEL || "info").toUpperCase() as Level;
  return LEVEL_ORDER[configured] ?? LEVEL_ORDER.INFO;
}

const SECRET_KEY_PATTERN = /(key|token|password|secret|uri|credential)/i;

function redact(
  meta?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!meta) return undefined;

  const clone: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(meta)) {
    clone[k] = SECRET_KEY_PATTERN.test(k) ? "[REDACTED]" : v;
  }

  return clone;
}

function write(
  level: Level,
  message: string,
  meta?: Record<string, unknown>
) {
  if (LEVEL_ORDER[level] < currentThreshold()) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  };

  const line = JSON.stringify(entry);

  // MCP stdio transport uses stdout for protocol messages.
  // All application logs must go to stderr.
  console.error(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    write("DEBUG", message, meta),

  info: (message: string, meta?: Record<string, unknown>) =>
    write("INFO", message, meta),

  warn: (message: string, meta?: Record<string, unknown>) =>
    write("WARN", message, meta),

  error: (message: string, meta?: Record<string, unknown>) =>
    write("ERROR", message, meta),
};