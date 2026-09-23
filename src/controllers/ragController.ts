import type { Request, Response } from "express";
import { searchMarketKnowledge } from "../services/ragService.js";
import { marketKnowledgeSchema, parseOrThrow } from "../utils/validation.js";

export async function searchRag(req: Request, res: Response) {
  const input = parseOrThrow(marketKnowledgeSchema, {
    query: req.query.query,
    district: req.query.district,
    market: req.query.market,
    commodity: req.query.commodity,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    topK: req.query.topK ? Number(req.query.topK) : undefined,
  });

  const results = await searchMarketKnowledge(input);

  res.json({
    success: true,
    data: { query: input.query, resultCount: results.length, results },
    metadata: {
      source: "AGMARKNET",
      sourceUrl: process.env.AGMARKNET_URL || "https://agmarknet.gov.in/home",
    },
  });
}
