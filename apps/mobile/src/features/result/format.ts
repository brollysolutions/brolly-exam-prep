/**
 * Number/duration formatting for the result and solutions screens. Deliberately
 * Intl-free: Hermes ships Intl only on some platforms, and jest must produce the same
 * string the phone does.
 */

/** `82` -> `'1m 22s'`, `48` -> `'48s'`. Always Latin, always rendered inside `<Num>`. */
export function formatDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

/** `9033` -> `'9,033'`. Thousands grouping only; the digits stay Latin for `<Num>`. */
export function formatCount(value: number): string {
  const safe = Number.isFinite(value) ? Math.trunc(value) : 0;
  const sign = safe < 0 ? '-' : '';
  const digits = Math.abs(safe).toString();
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ',';
    out += digits[i];
  }
  return sign + out;
}

/** `1284, 9033` -> `'1,284 / 9,033'`. */
export const formatRank = (rank: number, total: number): string =>
  `${formatCount(rank)} / ${formatCount(total)}`;

/** Basic Latin through Latin Extended-B: everything Archivo can draw. */
const LATIN_END = 0x024f;
/** General punctuation, currency, arrows and maths - where the fixtures' minus sign lives. */
const SYMBOL_START = 0x2000;
const SYMBOL_END = 0x22ff;

/**
 * True when a value can render in the Latin face, i.e. inside `<Num>`. The localised
 * "what cost you marks" values carry their units in Telugu and Urdu, and Archivo has no
 * glyphs for those - such values must stay in the language's own face.
 */
export function isLatinValue(value: string): boolean {
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code <= LATIN_END) continue;
    if (code >= SYMBOL_START && code <= SYMBOL_END) continue;
    return false;
  }
  return true;
}
