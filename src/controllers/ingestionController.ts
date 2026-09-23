import type { Request, Response } from "express";
import { z } from "zod";
import { runIngestion } from "../services/ingestionService.js";
import { AgmarknetService } from "../services/agmarknet/agmarknetService.js";
import { SampleMarketDataService } from "../services/agmarknet/sampleMarketDataService.js";
import { latestArrivalDate } from "../repositories/marketDataRepository.js";
import { addDays, todayString } from "../utils/dateUtils.js";
import { parseOrThrow } from "../utils/validation.js";
import { ApiError } from "../middleware/errorHandler.js";
import type { MarketDataSource } from "../services/agmarknet/marketDataSource.js";

function resolveSource(req: Request): MarketDataSource {
  const useSample = req.query.source === "sample" || req.body?.source === "sample";
  return useSample ? new SampleMarketDataService() : new AgmarknetService();
}

export async function runManualIngestion(req: Request, res: Response) {
  const source = resolveSource(req);
  const latest = await latestArrivalDate();
  const startDate = latest ? addDays(latest, 1) : addDays(todayString(), -1);
  const endDate = todayString();

  if (startDate > endDate) {
    res.json({
      success: true,
      data: { status: "NO_NEW_DATA", message: "Stored data is already up to date." },
    });
    return;
  }

  const result = await runIngestion(source, startDate, endDate, "MANUAL_SYNC");
  res.json({ success: true, data: result });
}

const backfillSchema = z
  .object({
    startDate: z.string(),
    endDate: z.string(),
  })
  .refine((v) => v.startDate <= v.endDate, { message: "startDate must not be after endDate" });

export async function runBackfill(req: Request, res: Response) {
  const input = parseOrThrow(backfillSchema, req.body);
  const source = resolveSource(req);

  if (!(source instanceof SampleMarketDataService) && process.env.NODE_ENV === "production") {
    // Guard rail: live backfills against the real site should be run via
    // the CLI script (scripts/backfill.ts) with proper monitoring, not
    // fired ad-hoc from an HTTP request in production.
    throw new ApiError(
      400,
      "Live AGMARKNET backfill via REST is disabled in production. Use `npm run backfill` instead, or pass ?source=sample for development."
    );
  }

  const result = await runIngestion(source, input.startDate, input.endDate, "BACKFILL");
  res.json({ success: true, data: result });
}
