import type { RawMarketRow } from "../../utils/normalization.js";

export interface FetchOptions {
  priceArrivals: string;
  state: string;
  district?: string;
  market?: string;
  commodityGroup: string;
  commodity: string;
  variety: string;
  grade: string;
}

export interface FetchResult {
  rows: RawMarketRow[];
  pagesProcessed: number;
}

export interface MarketDataSource {
  readonly sourceName: "AGMARKNET" | "SAMPLE";
  readonly sourceUrl: string;
  fetchDailyData(date: string, options: FetchOptions): Promise<FetchResult>;
  fetchHistoricalData(startDate: string, endDate: string, options: FetchOptions): Promise<FetchResult>;
}
