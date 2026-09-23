import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  connectToDatabase,
  closeDatabase,
  getDb,
} from "../src/services/mongodb.js";
import type { NewMarketData } from "../src/models/marketData.js";
import { buildRecordKey } from "../src/utils/recordKey.js";

const HISTORICAL_DIR = "data/historical";

const SOURCE_URL =
  process.env.AGMARKNET_URL ||
  "https://agmarknet.gov.in/daily-price-and-arrival-report";

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());

  return values;
}

function parseCsvFile(filePath: string): Record<string, string>[] {
  const content = readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");

  const lines = content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function cleanString(value: string | undefined): string | null {
  const cleaned = (value ?? "").trim();

  return cleaned === "" ? null : cleaned;
}

function parsePrice(value: string | undefined): number | null {
  if (!value) return null;

  const cleaned = value
    .trim()
    .replace(/"/g, "")
    .replace(/,/g, "");

  if (!cleaned) return null;

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function normalizeDate(value: string | undefined): string {
  const date = (value ?? "").trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const match = date.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

  if (match) {
    const [, day, month, year] = match;

    return `${year}-${month}-${day}`;
  }

  // DD-MM-YY or DD/MM/YY
  const shortMatch = date.match(/^(\d{2})[-/](\d{2})[-/](\d{2})$/);

  if (shortMatch) {
    const [, day, month, year] = shortMatch;

    return `20${year}-${month}-${day}`;
  }

  return date;
}

async function main() {
  await connectToDatabase();

  const db = getDb();

  const collection = db.collection<NewMarketData>("market_data");

  const files = readdirSync(HISTORICAL_DIR)
    .filter((file) => file.toLowerCase().endsWith(".csv"))
    .sort();

  console.log(`Found ${files.length} historical CSV files.`);

  if (files.length === 0) {
    throw new Error(`No CSV files found in ${HISTORICAL_DIR}`);
  }

  let totalRows = 0;
  let totalInserted = 0;
  let totalDuplicates = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const filePath = join(HISTORICAL_DIR, file);

    console.log(`\nProcessing: ${file}`);

    const rows = parseCsvFile(filePath);

    console.log(`Rows found: ${rows.length}`);

    totalRows += rows.length;

    const documents: NewMarketData[] = [];

    for (const row of rows) {
      const state = row["State/UT"]?.trim() || "";
      const district = row["District"]?.trim() || "";
      const market = row["Market"]?.trim() || "";
      const commodityGroup = row["Commodity Group"]?.trim() || "";
      const commodity = row["Commodity"]?.trim() || "";

      const variety = cleanString(row["Variety"]);
      const grade = cleanString(row["Grade"]);

      const arrivalDate = normalizeDate(row["Price Date"]);

      if (
        !state ||
        !district ||
        !market ||
        !commodity ||
        !arrivalDate
      ) {
        totalSkipped++;
        continue;
      }

      const minPrice = parsePrice(row["Min Price"]);
      const maxPrice = parsePrice(row["Max Price"]);
      const modalPrice = parsePrice(row["Modal Price"]);

      const unit = cleanString(row["Price Unit"]);

      // Use the same recordKey method as the daily scraper.
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

      documents.push({
        recordKey,
        state,
        district,
        market,
        commodityGroup,
        commodity,
        variety,
        grade,
        arrivalDate,
        minPrice,
        maxPrice,
        modalPrice,
        arrivalQuantity: null,
        unit,
        source: "AGMARKNET",
        sourceUrl: SOURCE_URL,
        scrapedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (documents.length === 0) {
      console.log("No valid records found in this file.");
      continue;
    }

    // Remove duplicate records inside the current CSV itself.
    const uniqueDocuments = Array.from(
      new Map(
        documents.map((document) => [document.recordKey, document])
      ).values()
    );

    const existingKeys = new Set<string>();

    const keys = uniqueDocuments.map(
      (document) => document.recordKey
    );

    for (let i = 0; i < keys.length; i += 1000) {
      const batchKeys = keys.slice(i, i + 1000);

      const existing = await collection
        .find(
          {
            recordKey: {
              $in: batchKeys,
            },
          },
          {
            projection: {
              recordKey: 1,
            },
          }
        )
        .toArray();

      for (const item of existing) {
        existingKeys.add(item.recordKey);
      }
    }

    const newDocuments = uniqueDocuments.filter(
      (document) => !existingKeys.has(document.recordKey)
    );

    if (newDocuments.length > 0) {
      await collection.insertMany(newDocuments, {
        ordered: false,
      });
    }

    const inserted = newDocuments.length;

    const duplicates =
      uniqueDocuments.length - newDocuments.length;

    totalInserted += inserted;
    totalDuplicates += duplicates;

    console.log(`Valid records: ${documents.length}`);
    console.log(`Unique records: ${uniqueDocuments.length}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Duplicates skipped: ${duplicates}`);
  }

  console.log("\n========================================");
  console.log("HISTORICAL IMPORT COMPLETED");
  console.log("========================================");
  console.log(`CSV rows:           ${totalRows}`);
  console.log(`Inserted:           ${totalInserted}`);
  console.log(`Duplicates skipped: ${totalDuplicates}`);
  console.log(`Invalid/skipped:    ${totalSkipped}`);
  console.log("========================================");

  await closeDatabase();
}

main().catch(async (error) => {
  console.error("\nHistorical import failed:");
  console.error(error);

  try {
    await closeDatabase();
  } catch {
    // Ignore close errors
  }

  process.exit(1);
});

