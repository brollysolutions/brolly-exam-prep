/**
 * Number/duration formatting shared by every screen that prints one. Deliberately
 * Intl-free: Hermes ships Intl only on some platforms, and jest must produce the same
 * string the phone does.
 */

/**
 * How a duration spells its units. English abuts them to the digits ("54s"); Telugu and
 * Urdu units are separate words ("54 sec"), the way `COST_ROWS` already writes them.
 */
export type DurationUnits = { minute: string; second: string; separator: string };

/** The default: what the prototype prints, and what a value inside `<Num>` can render. */
export const LATIN_UNITS: DurationUnits = { minute: 'm', second: 's', separator: '' };

/** A number and the unit that follows it, kept apart so the digits can stay in `<Num>`. */
export type DurationPart = { value: string; unit: string };

/** `82` -> `[1 minute, 22 second]`, `48` -> `[48 second]`. Seconds are padded when minutes lead. */
export function durationParts(
  totalSeconds: number,
  units: DurationUnits = LATIN_UNITS,
): DurationPart[] {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  if (minutes === 0) return [{ value: String(seconds), unit: units.second }];
  return [
    { value: String(minutes), unit: units.minute },
    { value: String(seconds).padStart(2, '0'), unit: units.second },
  ];
}

/**
 * `82` -> `'1m 22s'`, `48` -> `'48s'`; with localised units, `'1 min 22 sec'`. The flat
 * string is what a screen reader announces - on screen the parts render separately so the
 * digits keep the Latin face and the unit keeps the language's own.
 */
export const formatDuration = (totalSeconds: number, units: DurationUnits = LATIN_UNITS): string =>
  durationParts(totalSeconds, units)
    .map((part) => `${part.value}${units.separator}${part.unit}`)
    .join(' ');

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
