import { describe, it, expect } from "vitest";
import {
  isValidDateString,
  addDays,
  subtractYears,
  dateRange,
  daysBetween,
  isAfter,
} from "../src/utils/dateUtils.js";

describe("dateUtils", () => {
  it("validates correct YYYY-MM-DD dates", () => {
    expect(isValidDateString("2026-09-01")).toBe(true);
  });

  it("rejects calendrically invalid dates like Feb 30", () => {
    expect(isValidDateString("2026-02-30")).toBe(false);
  });

  it("rejects malformed date strings", () => {
    expect(isValidDateString("2026/09/01")).toBe(false);
    expect(isValidDateString("not-a-date")).toBe(false);
  });

  it("adds days correctly across month boundaries", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("subtracts years correctly, including leap-year edge case", () => {
    expect(subtractYears("2026-09-01", 1)).toBe("2025-09-01");
  });

  it("computes an inclusive date range", () => {
    const range = dateRange("2026-08-01", "2026-08-03");
    expect(range).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"]);
  });

  it("throws when range start is after end", () => {
    expect(() => dateRange("2026-08-03", "2026-08-01")).toThrow();
  });

  it("computes days between two dates", () => {
    expect(daysBetween("2026-08-01", "2026-08-31")).toBe(30);
  });

  it("correctly compares date ordering", () => {
    expect(isAfter("2026-08-02", "2026-08-01")).toBe(true);
    expect(isAfter("2026-08-01", "2026-08-01")).toBe(false);
  });
});
