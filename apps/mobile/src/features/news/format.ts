/**
 * F-24 — the one date format the updates and current-affairs screens print.
 *
 * Deliberately `Intl`-free, like `src/ui/format.ts`: Hermes ships `Intl` only on some
 * platforms, and jest has to produce the string the phone does. It is also `Date`-free —
 * `new Date('2026-08-04')` is parsed as UTC midnight and printed in the device's zone, which
 * moves a notice to the previous day for every reader west of Greenwich.
 *
 * The month is abbreviated in Latin because the whole string renders inside `<Num>`: Latin
 * face, tabular figures, LTR-isolated, so a date never re-orders inside an Urdu line and the
 * day columns line up down the list. Archivo has no Telugu or Nastaliq glyphs, so a
 * translated month name in that face would be tofu.
 */

import { isoDayParts } from '@/lib/day';

export { isIsoDay } from '@/lib/day';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * `'2026-08-04'` -> `'4 Aug 2026'`. The day loses its leading zero; the year never does.
 *
 * Anything that is not a real calendar day is returned unchanged rather than turned into
 * `NaN NaN`: a fixture or an API row with a malformed date should show its own broken value
 * on the row, where it is obvious, instead of a plausible wrong one.
 */
export function formatDay(value: string): string {
  const ymd = isoDayParts(value);
  if (!ymd) return value;
  return `${ymd[2]} ${MONTHS[ymd[1] - 1]} ${ymd[0]}`;
}
