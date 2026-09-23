import type { NextFunction, Request, Response } from "express";
import { ApiError } from "./errorHandler.js";

/**
 * Protects admin-only ingestion endpoints. Expects header:
 *   x-admin-api-key: <ADMIN_API_KEY from .env>
 * Never hard-codes the key; if it's not configured, all admin requests
 * are rejected (fail-closed) rather than silently allowed.
 */
export function adminAuth(req: Request, _res: Response, next: NextFunction) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) {
    next(new ApiError(500, "ADMIN_API_KEY is not configured on the server"));
    return;
  }
  const providedKey = req.header("x-admin-api-key");
  if (!providedKey || providedKey !== configuredKey) {
    next(new ApiError(401, "Unauthorized: missing or invalid x-admin-api-key header"));
    return;
  }
  next();
}
