import { createHash } from "node:crypto";

export interface RecordKeyInput {
  state: string;
  district: string;
  market: string;
  commodityGroup: string;
  commodity: string;
  variety: string | null;
  grade: string | null;
  arrivalDate: string;
}

/**
 * Deterministic unique key for a market_data record.
 *
 * Uniqueness dimensions (per AGMARKNET "Market Wise Price & Arrival" table):
 * state + district + market + commodityGroup + commodity + variety + grade + arrivalDate
 *
 * Normalizing (trim + lowercase) prevents accidental duplicates caused by
 * whitespace or casing differences between scraping runs.
 */
export function buildRecordKey(input: RecordKeyInput): string {
  const normalize = (v: string | null | undefined) => (v ?? "NA").trim().toLowerCase();
  const raw = [
    normalize(input.state),
    normalize(input.district),
    normalize(input.market),
    normalize(input.commodityGroup),
    normalize(input.commodity),
    normalize(input.variety),
    normalize(input.grade),
    normalize(input.arrivalDate),
  ].join("|");
  return createHash("sha256").update(raw).digest("hex");
}
