/**
 * F-23 — the two date shapes Home prints, and the countdown behind its hero.
 *
 * Deliberately `Intl`-free: Hermes ships `Intl` only on some platforms, and jest has to
 * produce the string the phone does. Home writes dates as digits rather than as words — a
 * month name would have to be translated and would leave the Latin face mid-line in Telugu,
 * where a numeric date goes through `<Num>` instead: tabular, LTR-isolated, and identical in
 * both languages. Day-first, which is how India writes them.
 *
 * `/updates` and `/affairs` print their own, longer form (`src/features/news/format.ts`):
 * those screens have a row to spend on a month name, a 60 px notice card does not. Both
 * parse through the same strict `isoDayParts`, so a malformed date is refused the same way.
 */

import { isoDayParts } from '@/lib/day';

const DAY_MS = 86_400_000;

/**
 * Whole calendar days from today to an exam date: positive before it, zero on the day and
 * negative after it, so Home can tell "exam day" from "already held" instead of counting
 * down to zero for ever. An unreadable date counts as zero.
 *
 * Both ends are pinned to LOCAL midnight before subtracting. `new Date('2026-10-18')` parses
 * as UTC midnight, which is 5:30 am in Chennai — subtract that from a local `now` and the
 * count is a day out for every candidate reading Home in the evening.
 */
export function daysUntil(isoDate: string, now: number = Date.now()): number {
  const ymd = isoDayParts(isoDate);
  if (!ymd) return 0;
  const target = new Date(ymd[0], ymd[1] - 1, ymd[2]).getTime();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / DAY_MS);
}

/** `DD-MM` — the compact form, for a shelf card that has no room for a year. */
export const shortDate = (isoDate: string): string => {
  const ymd = isoDayParts(isoDate);
  return ymd ? `${String(ymd[2]).padStart(2, '0')}-${String(ymd[1]).padStart(2, '0')}` : isoDate;
};

/** `DD-MM-YYYY` — the long form, for the one date on the screen that carries a year. */
export const fullDate = (isoDate: string): string => {
  const ymd = isoDayParts(isoDate);
  return ymd ? `${shortDate(isoDate)}-${ymd[0]}` : isoDate;
};
