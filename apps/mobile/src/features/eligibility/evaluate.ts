import {
  standardEntries,
  standardsFor,
  type Gender,
  type PhysicalStandards,
  type Post,
  type StandardKey,
  type StandardsGroup,
} from '@tslprb/fixtures';

/** What the candidate typed, already parsed. Every measurement is optional: the form is a draft. */
export type EligibilityInput = {
  post: Post;
  gender: Gender;
  group: StandardsGroup;
  heightCm?: number;
  chestCm?: number;
  chestExpansionCm?: number;
  run1600s?: number;
  run800s?: number;
  run100s?: number;
  longJumpM?: number;
  shotPutM?: number;
};

export type EligibilityRow = {
  key: StandardKey;
  /** The figure to beat, in the row's own unit. */
  required: string | number;
  /** What the candidate entered, if they entered it. */
  actual?: number;
  /** `undefined` = not answered yet, so this row cannot pass or fail. */
  pass?: boolean;
  /** `false` = the figure is seeded from secondary reporting; the screen tags the row. */
  verified: boolean;
};

export type Verdict = 'eligible' | 'notYet' | 'incomplete';

export type Evaluation = {
  rows: EligibilityRow[];
  verdict: Verdict;
  /** The keys that came back short — the list the screen turns into "what to work on". */
  improve: StandardKey[];
};

/** Raw field text keyed by the standard it answers, exactly as typed. */
export type MeasureValues = Partial<Record<StandardKey, string>>;

/**
 * A typed field as a number, or `undefined` for "not answered".
 *
 * A decimal comma is accepted because a Telugu keyboard offers one, and anything at or
 * below zero is treated as blank: a height of 0 is a half-typed number, not a failing one, and
 * failing someone on it would be a lie.
 */
export function parseMeasure(text: string | undefined): number | undefined {
  if (text === undefined) return undefined;
  const trimmed = text.replace(',', '.').trim();
  if (trimmed === '') return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Field text → the numbers `evaluate` measures, so the screen never parses anything itself. */
export function toInput(
  post: Post,
  gender: Gender,
  group: StandardsGroup,
  values: MeasureValues,
): EligibilityInput {
  return {
    post,
    gender,
    group,
    heightCm: parseMeasure(values.height),
    chestCm: parseMeasure(values.chest),
    chestExpansionCm: parseMeasure(values.chestExpansion),
    run1600s: parseMeasure(values.run1600m),
    run800s: parseMeasure(values.run800m),
    run100s: parseMeasure(values.run100m),
    longJumpM: parseMeasure(values.longJump),
    shotPutM: parseMeasure(values.shotPut),
  };
}

/** Which input field answers which standard. */
const ACTUAL: Record<StandardKey, (i: EligibilityInput) => number | undefined> = {
  height: (i) => i.heightCm,
  chest: (i) => i.chestCm,
  chestExpansion: (i) => i.chestExpansionCm,
  run1600m: (i) => i.run1600s,
  run800m: (i) => i.run800s,
  run100m: (i) => i.run100s,
  longJump: (i) => i.longJumpM,
  shotPut: (i) => i.shotPutM,
};

/**
 * Measure a candidate against the standards for their post, gender and category group.
 *
 * Pure and total: it never throws on a half-filled form, and the boundary counts as a pass —
 * the notification says "not less than 167.6 cm" and "within 7 min 15 s", so exactly 167.6 and
 * exactly 435 seconds qualify.
 *
 * A confirmed failure outranks a blank field. Someone who has typed a height 8 cm short is not
 * eligible whatever else they fill in later, and telling them "incomplete" would waste the trip
 * to the ground; `incomplete` is reserved for the case where nothing has failed *yet*.
 */
export function evaluate(
  input: EligibilityInput,
  standards: PhysicalStandards = standardsFor(input.post, input.gender, input.group),
): Evaluation {
  const rows: EligibilityRow[] = standardEntries(standards).map(({ key, standard }) => {
    const actual = ACTUAL[key](input);
    const pass =
      actual === undefined
        ? undefined
        : standard.dir === 'min'
          ? actual >= standard.value
          : actual <= standard.value;
    return { key, required: standard.value, actual, pass, verified: standard.verified };
  });

  const improve = rows.filter((r) => r.pass === false).map((r) => r.key);
  const verdict: Verdict = improve.length
    ? 'notYet'
    : rows.some((r) => r.pass === undefined)
      ? 'incomplete'
      : 'eligible';

  return { rows, verdict, improve };
}
