import type { StandardKey } from '@tslprb/fixtures';

/**
 * F-25 — the long runs are typed as minutes and seconds, stored as seconds.
 *
 * A single seconds field read "7.15" — the way the notification writes 7 min 15 s — as 7.15
 * seconds and passed it (review I4). Two fields cannot be misread that way, and the standard
 * is printed back as `7:15` so a candidate can check their own entry against it. The store
 * keeps seconds so `evaluate()` and the persisted `values` do not change shape.
 */

/** The events typed as `mm:ss`. The 100 m sprint stays a single seconds field with decimals. */
const LONG_RUNS: ReadonlySet<StandardKey> = new Set(['run1600m', 'run800m']);

export const isLongRun = (key: StandardKey): boolean => LONG_RUNS.has(key);

export type RunTimeParts = { min: string; sec: string };

/** A field's text as a non-negative number, or `undefined` for blank, junk or negative. */
function part(text: string): number | undefined {
  const trimmed = text.replace(',', '.').trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Same as `part`, but whole numbers only — for the minutes and seconds fields themselves. A
 * web hardware keyboard can type "7.1" where a phone's numeric pad would not, and neither a
 * fraction of a minute nor a fraction of a second typed into these two fields means anything:
 * the checker only ever compares whole mm:ss against a whole-number standard. This does not
 * apply to the 100 m sprint's own field (`parseMeasure` in evaluate.ts, a different path),
 * which keeps its decimals for hand-timed hundredths.
 */
function wholePart(text: string): number | undefined {
  const n = part(text);
  return n !== undefined && Number.isInteger(n) ? n : undefined;
}

/**
 * Minutes and seconds fields → the seconds string `evaluate()` reads. Blank seconds beside
 * a filled minutes field count as `m:00`, and blank minutes as zero; both blank is blank.
 * Junk — including a decimal — in either field makes the whole entry blank rather than a
 * half-number.
 */
export function joinRunTime(min: string, sec: string): string {
  const m = wholePart(min);
  const s = wholePart(sec);
  if (m === undefined && s === undefined) return '';
  if ((min.trim() !== '' && m === undefined) || (sec.trim() !== '' && s === undefined)) return '';
  return String((m ?? 0) * 60 + (s ?? 0));
}

/**
 * A stored seconds string → the two fields. Whole minutes are only shown when there are
 * any, so a value that was never a run time (a legacy "7.15") lands in the seconds field
 * where it is visibly wrong rather than in a plausible "0 : 7.15".
 */
export function splitRunTime(text: string | undefined): RunTimeParts {
  const total = part(text ?? '');
  if (total === undefined) return { min: '', sec: '' };
  const minutes = Math.floor(total / 60);
  const seconds = Math.round((total - minutes * 60) * 100) / 100;
  if (minutes === 0) return { min: '', sec: String(seconds) };
  return { min: String(minutes), sec: String(seconds).padStart(2, '0') };
}

/** `435` → `7:15`, the way the notification writes a run limit. Seconds keep any decimals. */
export function formatRunTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const rest = Math.round((safe - minutes * 60) * 100) / 100;
  const [whole, fraction] = String(rest).split('.');
  return `${minutes}:${whole.padStart(2, '0')}${fraction ? `.${fraction}` : ''}`;
}
