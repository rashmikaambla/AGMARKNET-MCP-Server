import { buildRecordKey } from "./recordKey.js";
import { isValidDateString } from "./dateUtils.js";
import type {
  MarketDataSource,
  NewMarketData,
} from "../models/marketData.js";

export interface RawMarketRow {
  state?: string | null;
  district?: string | null;
  market?: string | null;
  commodityGroup?: string | null;
  commodity?: string | null;

  variety?: string | null;
  grade?: string | null;

  arrivalDate?: string | null;

  minPrice?: string | number | null;
  maxPrice?: string | number | null;
  modalPrice?: string | number | null;

  arrivalQuantity?: string | number | null;

  unit?: string | null;
}

export class NormalizationError extends Error {}

function requireField(
  value: string | null | undefined,
  field: string
): string {
  const trimmed = (value ?? "").trim();

  if (!trimmed) {
    throw new NormalizationError(`Missing required field: ${field}`);
  }

  return trimmed;
}

/**
 * Convert AGMARKNET date formats into YYYY-MM-DD.
 *
 * Supported:
 * YYYY-MM-DD
 * DD-MM-YYYY
 * DD/MM/YYYY
 * DD-MMM-YYYY
 */
function normalizeDate(value: string): string {
  const date = value.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // DD-MM-YYYY
  const dashMatch = date.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    return `${year}-${month}-${day}`;
  }

  // DD/MM/YYYY
  const slashMatch = date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month}-${day}`;
  }

  // DD-MMM-YYYY
  const monthNames: Record<string, string> = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
  };

  const textMonthMatch = date.match(
    /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/
  );

  if (textMonthMatch) {
    const [, day, monthText, year] = textMonthMatch;
    const month = monthNames[monthText.toUpperCase()];

    if (month) {
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }
  }

  return date;
}

function toNullableNumber(
  value: string | number | null | undefined
): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const num = Number(cleaned);

  return Number.isFinite(num) ? num : null;
}

function toNullableString(
  value: string | null | undefined
): string | null {
  const trimmed = (value ?? "").trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeMarketRow(
  raw: RawMarketRow,
  source: MarketDataSource,
  sourceUrl: string
): NewMarketData {
  const state = requireField(raw.state, "state");
  const district = requireField(raw.district, "district");
  const market = requireField(raw.market, "market");
  const commodityGroup = requireField(
    raw.commodityGroup,
    "commodityGroup"
  );
  const commodity = requireField(raw.commodity, "commodity");

  const rawArrivalDate = requireField(
    raw.arrivalDate,
    "arrivalDate"
  );

  // IMPORTANT:
  // AGMARKNET currently returns DD-MM-YYYY,
  // while MongoDB stores YYYY-MM-DD.
  const arrivalDate = normalizeDate(rawArrivalDate);

  if (!isValidDateString(arrivalDate)) {
    throw new NormalizationError(
      `Invalid arrivalDate: ${rawArrivalDate} -> ${arrivalDate}`
    );
  }

  const variety = toNullableString(raw.variety);
  const grade = toNullableString(raw.grade);

  const recordKey = buildRecordKey({
    state,
    district,
    market,
    commodityGroup,
    commodity,
    variety,
    grade,
    arrivalDate,
  });

  const now = new Date();

  return {
    recordKey,
    state,
    district,
    market,
    commodityGroup,
    commodity,
    variety,
    grade,
    arrivalDate,

    minPrice: toNullableNumber(raw.minPrice),
    maxPrice: toNullableNumber(raw.maxPrice),
    modalPrice: toNullableNumber(raw.modalPrice),

    arrivalQuantity: toNullableNumber(raw.arrivalQuantity),

    unit: toNullableString(raw.unit),

    source,
    sourceUrl,

    scrapedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}