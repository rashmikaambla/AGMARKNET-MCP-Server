import type { Request, Response } from "express";
import * as marketDataService from "../services/marketDataService.js";
import { getSystemMetadata } from "../repositories/metadataRepository.js";
import { latestIngestionLog } from "../repositories/ingestionRepository.js";
import { countAll } from "../repositories/marketDataRepository.js";
import { countRagDocuments } from "../repositories/ragRepository.js";
import {
  dailyMarketDataSchema,
  districtMarketDataSchema,
  stateMarketDataSchema,
  marketDataSchema,
  commodityPriceSchema,
  priceTrendSchema,
  marketListSchema,
  parseOrThrow,
} from "../utils/validation.js";

function ok(res: Response, data: unknown) {
  res.json({
    success: true,
    data,
    metadata: {
      source: "AGMARKNET",
      sourceUrl: process.env.AGMARKNET_URL || "https://agmarknet.gov.in/home",
      generatedAt: new Date().toISOString(),
    },
  });
}

export async function getDailyMarketData(req: Request, res: Response) {
  const input = parseOrThrow(dailyMarketDataSchema, {
    district: req.query.district,
    date: req.query.date,
  });
  ok(res, await marketDataService.getDailyMarketData(input.district, input.date));
}

export async function getDistrictMarketData(req: Request, res: Response) {
  const input = parseOrThrow(districtMarketDataSchema, {
    district: req.params.district,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });
  ok(res, await marketDataService.getDistrictMarketData(input.district, input.startDate, input.endDate));
}

export async function getStateMarketData(req: Request, res: Response) {
  const input = parseOrThrow(stateMarketDataSchema, {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });
  ok(res, await marketDataService.getStateMarketData(input.startDate, input.endDate));
}

export async function getMarketData(req: Request, res: Response) {
  const input = parseOrThrow(marketDataSchema, {
    market: req.params.market,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    commodity: req.query.commodity,
  });
  ok(res, await marketDataService.getMarketData(input.market, input.startDate, input.endDate, input.commodity));
}

export async function getCommodityPrice(req: Request, res: Response) {
  const input = parseOrThrow(commodityPriceSchema, {
    commodity: req.params.commodity,
    district: req.query.district,
    market: req.query.market,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });
  ok(
    res,
    await marketDataService.getCommodityPrice(
      input.commodity,
      input.startDate,
      input.endDate,
      input.district,
      input.market
    )
  );
}

export async function getPriceTrend(req: Request, res: Response) {
  const input = parseOrThrow(priceTrendSchema, {
    commodity: req.params.commodity,
    district: req.query.district,
    market: req.query.market,
    days: req.query.days ? Number(req.query.days) : 30,
  });
  ok(res, await marketDataService.getPriceTrend(input.commodity, input.days, input.district, input.market));
}

export async function getMarkets(req: Request, res: Response) {
  const input = parseOrThrow(marketListSchema, { district: req.query.district });
  ok(res, await marketDataService.getMarketList(input.district));
}

export async function getDataStatus(_req: Request, res: Response) {
  const [metadata, lastLog, totalRecords, ragDocumentCount] = await Promise.all([
    getSystemMetadata(),
    latestIngestionLog(),
    countAll(),
    countRagDocuments(),
  ]);
  ok(res, { metadata, lastIngestionLog: lastLog, totalRecords, ragDocumentCount });
}

export async function health(_req: Request, res: Response) {
  res.json({ success: true, data: { status: "ok", timestamp: new Date().toISOString() } });
}
