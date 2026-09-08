/**
 * The one `YYYY-MM-DD` parser, shared by Home's countdown and the news screens' dates.
 *
 * Strict on purpose: `2026-13-45` used to roll over into a plausible wrong date on Home
 * while `/updates` refused it (review M4). Now both refuse it the same way.
 */

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days in `month` (1-12) of `year`, Gregorian, leap years included. */
function daysInMonth(year: number, month: number): number {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/** `YYYY-MM-DD` as `[year, month, day]` when it is a real calendar day — `2026-02-30` is not. */
export function isoDayParts(value: string): [number, number, number] | undefined {
  const match = ISO_DAY.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return undefined;
  return [year, month, day];
}

/** True when `value` is a real `YYYY-MM-DD` calendar day. */
export const isIsoDay = (value: string): boolean => isoDayParts(value) !== undefined;
