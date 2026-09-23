const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns true if the string is a syntactically and calendrically valid YYYY-MM-DD date. */
export function isValidDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function parseDate(value: string): Date {
  if (!isValidDateString(value)) {
    throw new Error(`Invalid date string: ${value}. Expected format YYYY-MM-DD.`);
  }
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayString(): string {
  return formatDate(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDate(d);
}

export function subtractDays(dateStr: string, days: number): string {
  return addDays(dateStr, -days);
}

export function subtractYears(dateStr: string, years: number): string {
  const d = parseDate(dateStr);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return formatDate(d);
}

export function isAfter(a: string, b: string): boolean {
  return parseDate(a).getTime() > parseDate(b).getTime();
}

export function isBeforeOrEqual(a: string, b: string): boolean {
  return parseDate(a).getTime() <= parseDate(b).getTime();
}

/** Inclusive list of YYYY-MM-DD strings between start and end. */
export function dateRange(start: string, end: string): string[] {
  if (isAfter(start, end)) {
    throw new Error(`start (${start}) must not be after end (${end})`);
  }
  const dates: string[] = [];
  let cursor = start;
  while (isBeforeOrEqual(cursor, end)) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function daysBetween(a: string, b: string): number {
  const ms = parseDate(b).getTime() - parseDate(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
