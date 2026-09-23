import type { ObjectId } from "mongodb";

export interface Market {
  _id?: ObjectId;
  state: string;
  district: string;
  market: string;
  source: string;
  sourceUrl: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NewMarket = Omit<Market, "_id">;

export const MARKETS_COLLECTION = "markets";
