import { readFileSync } from "node:fs";
import { parseCsv } from "../../utils/csv.js";
import { dateRange } from "../../utils/dateUtils.js";
import type { RawMarketRow } from "../../utils/normalization.js";
import type { FetchOptions, FetchResult, MarketDataSource } from "./marketDataSource.js";
import { logger } from "../../utils/logger.js";

/**
 * Development/testing data source backed by data/agmarknet_sample.csv.
 *
 * This is intentionally NEVER used as the default production source
 * (see AgmarknetService). All records produced here must be persisted
 * with source="SAMPLE" — enforced by ingestionService, not by this class,
 * to keep the "what source wrote this record" decision in one place.
 */
export class SampleMarketDataService implements MarketDataSource {
  readonly sourceName = "SAMPLE" as const;
  readonly sourceUrl = "local://data/agmarknet_sample.csv";

  constructor(private readonly csvPath: string = "data/agmarknet_sample.csv") {
    if (process.env.ALLOW_SAMPLE_DATA !== "true") {
      throw new Error(
        "Sample data is disabled. Set ALLOW_SAMPLE_DATA=true in .env to use SampleMarketDataService."
      );
    }
  }

  private loadAll(): RawMarketRow[] {
    const content = readFileSync(this.csvPath, "utf-8");
    return parseCsv(content);
  }

  async fetchDailyData(date: string, options: FetchOptions): Promise<FetchResult> {
    return this.fetchHistoricalData(date, date, options);
  }

  async fetchHistoricalData(
    startDate: string,
    endDate: string,
    options: FetchOptions
  ): Promise<FetchResult> {
    const all = this.loadAll();
    const wanted = new Set(dateRange(startDate, endDate));
    const rows = all.filter((row) => {
      if (!row.arrivalDate || !wanted.has(row.arrivalDate)) return false;
      if (options.district && options.district !== "All Districts" && row.district !== options.district)
        return false;
      if (options.market && options.market !== "All Markets" && row.market !== options.market) return false;
      if (options.commodity && options.commodity !== "All Commodity" && row.commodity !== options.commodity)
        return false;
      return true;
    });
    logger.debug("SampleMarketDataService: matched rows", { count: rows.length, startDate, endDate });
    return { rows, pagesProcessed: 1 };
  }
}
