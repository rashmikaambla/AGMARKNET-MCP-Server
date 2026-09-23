import * as marketDataRepo from "../repositories/marketDataRepository.js";
import * as marketRepo from "../repositories/marketRepository.js";
import type { MarketData } from "../models/marketData.js";
import { addDays, todayString } from "../utils/dateUtils.js";

export interface PriceStats {
  recordCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  averageModalPrice: number | null;
}

function computeStats(records: MarketData[]): PriceStats {
  const modalValues = records.map((r) => r.modalPrice).filter((v): v is number => v !== null);
  const minValues = records.map((r) => r.minPrice).filter((v): v is number => v !== null);
  const maxValues = records.map((r) => r.maxPrice).filter((v): v is number => v !== null);

  return {
    recordCount: records.length,
    minPrice: minValues.length ? Math.min(...minValues) : null,
    maxPrice: maxValues.length ? Math.max(...maxValues) : null,
    averageModalPrice: modalValues.length
      ? Number((modalValues.reduce((a, b) => a + b, 0) / modalValues.length).toFixed(2))
      : null,
  };
}

export async function getDailyMarketData(district: string, date: string) {
  const records = await marketDataRepo.findByFilters({ district, date });
  return {
    district,
    date,
    markets: [...new Set(records.map((r) => r.market))],
    commodities: [...new Set(records.map((r) => r.commodity))],
    records,
    recordCount: records.length,
  };
}

export async function getDistrictMarketData(district: string, startDate: string, endDate: string) {
  const records = await marketDataRepo.findByFilters({ district, startDate, endDate });
  return {
    district,
    startDate,
    endDate,
    markets: [...new Set(records.map((r) => r.market))],
    commodities: [...new Set(records.map((r) => r.commodity))],
    records,
    statistics: computeStats(records),
  };
}

export async function getStateMarketData(startDate: string, endDate: string) {
  const state = process.env.AGMARKNET_STATE || "Gujarat";
  const records = await marketDataRepo.findByFilters({ state, startDate, endDate });
  return {
    state,
    startDate,
    endDate,
    totalRecords: records.length,
    districts: [...new Set(records.map((r) => r.district))],
    markets: [...new Set(records.map((r) => r.market))],
    commodities: [...new Set(records.map((r) => r.commodity))],
    statistics: computeStats(records),
  };
}

export async function getMarketData(
  market: string,
  startDate?: string,
  endDate?: string,
  commodity?: string
) {
  const records = await marketDataRepo.findByFilters({ market, startDate, endDate, commodity });
  return {
    market,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    commodity: commodity ?? null,
    records,
    statistics: computeStats(records),
  };
}

export async function getCommodityPrice(
  commodity: string,
  startDate: string,
  endDate: string,
  district?: string,
  market?: string
) {
  const records = await marketDataRepo.findByFilters({ commodity, district, market, startDate, endDate });
  const stats = computeStats(records);

  const sorted = [...records].sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate));
  let trend: "increasing" | "decreasing" | "stable" | "insufficient_data" = "insufficient_data";
  if (sorted.length >= 2) {
    const first = sorted[0].modalPrice;
    const last = sorted[sorted.length - 1].modalPrice;
    if (first !== null && last !== null && first !== 0) {
      const pctChange = ((last - first) / first) * 100;
      trend = pctChange > 1 ? "increasing" : pctChange < -1 ? "decreasing" : "stable";
    }
  }

  return {
    commodity,
    district: district ?? null,
    market: market ?? null,
    startDate,
    endDate,
    statistics: stats,
    trend,
    note: "Trend reflects a historical observation over the requested range, not a prediction.",
  };
}

export interface DailyTrendPoint {
  date: string;
  averageModalPrice: number | null;
  recordCount: number;
}

export async function getPriceTrend(
  commodity: string,
  days: number,
  district?: string,
  market?: string
) {
  const endDate = todayString();
  const startDate = addDays(endDate, -Math.max(days - 1, 0));
  const records = await marketDataRepo.findByFilters({ commodity, district, market, startDate, endDate });

  const byDate = new Map<string, number[]>();
  for (const record of records) {
    if (record.modalPrice === null) continue;
    const list = byDate.get(record.arrivalDate) ?? [];
    list.push(record.modalPrice);
    byDate.set(record.arrivalDate, list);
  }

  const dailyPrices: DailyTrendPoint[] = [...byDate.entries()]
    .map(([date, prices]) => ({
      date,
      averageModalPrice: Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)),
      recordCount: prices.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const values = dailyPrices.map((d) => d.averageModalPrice).filter((v): v is number => v !== null);
  const highestPrice = values.length ? Math.max(...values) : null;
  const lowestPrice = values.length ? Math.min(...values) : null;

  let percentageChange: number | null = null;
  let trendDirection: "increasing" | "decreasing" | "stable" | "insufficient_data" = "insufficient_data";
  if (values.length >= 2) {
    const first = values[0];
    const last = values[values.length - 1];
    if (first !== 0) {
      percentageChange = Number((((last - first) / first) * 100).toFixed(2));
      trendDirection = percentageChange > 1 ? "increasing" : percentageChange < -1 ? "decreasing" : "stable";
    }
  }

  return {
    commodity,
    district: district ?? null,
    market: market ?? null,
    startDate,
    endDate,
    dailyPrices,
    averagePrice: values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : null,
    highestPrice,
    lowestPrice,
    percentageChange,
    trendDirection,
    note: "This is a historical observation based on stored data, not a prediction.",
  };
}

export async function getMarketList(district?: string) {
  const markets = await marketRepo.listMarkets(district);
  return { district: district ?? null, count: markets.length, markets };
}

export async function getMarketSummary(district: string) {
  const state = process.env.AGMARKNET_STATE || "Gujarat";
  const endDate = todayString();
  const startDate = addDays(endDate, -30);
  const records = await marketDataRepo.findByFilters({ district, startDate, endDate });
  const markets = await marketRepo.listMarkets(district);

  const byCommodity = new Map<string, MarketData[]>();
  for (const record of records) {
    const list = byCommodity.get(record.commodity) ?? [];
    list.push(record);
    byCommodity.set(record.commodity, list);
  }

  const commodityBreakdown = [...byCommodity.entries()].map(([commodity, recs]) => ({
    commodity,
    statistics: computeStats(recs),
  }));

  return {
    state,
    district,
    windowStartDate: startDate,
    windowEndDate: endDate,
    majorMarkets: markets.map((m) => m.market),
    availableCommodities: [...byCommodity.keys()],
    commodityBreakdown,
    recentRecordCount: records.length,
  };
}

export async function getMarketComparison(
  commodity: string,
  markets: string[],
  startDate: string,
  endDate: string
) {
  const records = await marketDataRepo.findByMarkets(markets, commodity, startDate, endDate);

  const byMarket = new Map<string, MarketData[]>();
  for (const market of markets) byMarket.set(market, []);
  for (const record of records) {
    const list = byMarket.get(record.market) ?? [];
    list.push(record);
    byMarket.set(record.market, list);
  }

  const comparison = [...byMarket.entries()].map(([market, recs]) => {
    const stats = computeStats(recs);
    return { market, ...stats };
  });

  const withAverages = comparison.filter((c) => c.averageModalPrice !== null);
  const highest = withAverages.length
    ? withAverages.reduce((a, b) => ((a.averageModalPrice ?? 0) > (b.averageModalPrice ?? 0) ? a : b))
    : null;
  const lowest = withAverages.length
    ? withAverages.reduce((a, b) => ((a.averageModalPrice ?? Infinity) < (b.averageModalPrice ?? Infinity) ? a : b))
    : null;

  return {
    commodity,
    startDate,
    endDate,
    comparison,
    marketWithHighestAverage: highest?.market ?? null,
    marketWithLowestAverage: lowest?.market ?? null,
    priceDifference:
      highest && lowest && highest.averageModalPrice !== null && lowest.averageModalPrice !== null
        ? Number((highest.averageModalPrice - lowest.averageModalPrice).toFixed(2))
        : null,
  };
}
