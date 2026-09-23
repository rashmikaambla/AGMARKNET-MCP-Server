import type { ObjectId } from "mongodb";

export type MarketDataSource = "AGMARKNET" | "SAMPLE";

export interface MarketData {
  _id?: ObjectId;
  recordKey: string;
  state: string;
  district: string;
  market: string;
  commodityGroup: string;
  commodity: string;
  variety: string | null;
  grade: string | null;
  arrivalDate: string; // YYYY-MM-DD
  minPrice: number | null;
  maxPrice: number | null;
  modalPrice: number | null;
  arrivalQuantity: number | null;
  unit: string | null;
  source: MarketDataSource;
  sourceUrl: string;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NewMarketData = Omit<MarketData, "_id">;

export const MARKET_DATA_COLLECTION = "market_data";
