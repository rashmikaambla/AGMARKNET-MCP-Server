import type { NextFunction, Request, Response } from "express";
import { ValidationError } from "../utils/validation.js";
import { logger } from "../utils/logger.js";

export class ApiError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** Wraps an async Express handler so thrown errors reach errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ValidationError) {
    logger.warn("Validation error", { message: err.message, issues: err.issues });
    res.status(400).json({ success: false, error: { message: err.message, issues: err.issues } });
    return;
  }
  if (err instanceof ApiError) {
    logger.warn("API error", { message: err.message, statusCode: err.statusCode });
    res.status(err.statusCode).json({ success: false, error: { message: err.message } });
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  logger.error("Unhandled REST error", { message });
  res.status(500).json({ success: false, error: { message: "Internal server error" } });
}
