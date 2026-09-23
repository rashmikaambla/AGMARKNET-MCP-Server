import { z } from "zod";
import { isValidDateString } from "./dateUtils.js";

export class ValidationError extends Error {
  public readonly issues: string[];
  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

const dateString = z
  .string()
  .refine(isValidDateString, { message: "Must be a valid date in YYYY-MM-DD format" });

const nonEmptyString = z.string().trim().min(1, "Must not be empty");

export const dailyMarketDataSchema = z.object({
  district: nonEmptyString,
  date: dateString,
});

export const districtMarketDataSchema = z
  .object({
    district: nonEmptyString,
    startDate: dateString,
    endDate: dateString,
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "startDate must not be after endDate",
    path: ["startDate"],
  });

export const stateMarketDataSchema = z
  .object({
    startDate: dateString,
    endDate: dateString,
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "startDate must not be after endDate",
    path: ["startDate"],
  });

export const marketDataSchema = z
  .object({
    market: nonEmptyString,
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    commodity: nonEmptyString.optional(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    message: "startDate must not be after endDate",
    path: ["startDate"],
  });

export const commodityPriceSchema = z
  .object({
    commodity: nonEmptyString,
    district: nonEmptyString.optional(),
    market: nonEmptyString.optional(),
    startDate: dateString,
    endDate: dateString,
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "startDate must not be after endDate",
    path: ["startDate"],
  });

export const priceTrendSchema = z.object({
  commodity: nonEmptyString,
  district: nonEmptyString.optional(),
  market: nonEmptyString.optional(),
  days: z.number().int().positive("days must be a positive integer").max(3650),
});

export const marketListSchema = z.object({
  district: nonEmptyString.optional(),
});

export const marketKnowledgeSchema = z.object({
  query: nonEmptyString,
  district: nonEmptyString.optional(),
  market: nonEmptyString.optional(),
  commodity: nonEmptyString.optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
  topK: z.number().int().positive().max(50).optional().default(5),
});

export const marketSummarySchema = z.object({
  district: nonEmptyString,
});

export const dataSourceStatusSchema = z.object({});

export const marketComparisonSchema = z
  .object({
    commodity: nonEmptyString,
    markets: z.array(nonEmptyString).min(2, "At least two markets are required for comparison"),
    startDate: dateString,
    endDate: dateString,
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: "startDate must not be after endDate",
    path: ["startDate"],
  });

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new ValidationError("Input validation failed", issues);
  }
  return result.data;
}
