import type { RawMarketRow } from "./normalization.js";

/**
 * Minimal RFC-4180-ish CSV parser (handles quoted fields with commas/quotes).
 * No external dependency needed for the fixed, simple sample CSV schema used
 * in this project.
 */
export function parseCsv(content: string): RawMarketRow[] {
  const lines = content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows: RawMarketRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const record: Record<string, string> = {};
    header.forEach((h, idx) => {
      record[h] = (values[idx] ?? "").trim();
    });
    rows.push(record as unknown as RawMarketRow);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
