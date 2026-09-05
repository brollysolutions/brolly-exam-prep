import { standardsFor, type StandardKey } from '@tslprb/fixtures';

import { evaluate, parseMeasure, toInput, type EligibilityInput } from '../evaluate';

const PC_MALE = standardsFor('pc', 'male', 'general');
const PC_MALE_ST = standardsFor('pc', 'male', 'st');
const PC_FEMALE = standardsFor('pc', 'female', 'general');

/** A constable applicant who clears every standard with room to spare. */
const man = (over: Partial<EligibilityInput> = {}): EligibilityInput => ({
  post: 'pc',
  gender: 'male',
  group: 'general',
  heightCm: 172,
  chestCm: 90,
  chestExpansionCm: 6,
  run1600s: 420,
  longJumpM: 4.2,
  shotPutM: 6.1,
  ...over,
});

const woman = (over: Partial<EligibilityInput> = {}): EligibilityInput => ({
  post: 'pc',
  gender: 'female',
  group: 'general',
  heightCm: 158,
  run800s: 300,
  longJumpM: 3,
  shotPutM: 4.5,
  ...over,
});

/** An SI applicant: the same man, now timed over 100 m and 800 m instead of 1600 m. */
const siMan = (over: Partial<EligibilityInput> = {}): EligibilityInput => ({
  ...man({ run1600s: undefined }),
  post: 'si',
  run100s: 14,
  run800s: 160,
  ...over,
});

const keys = (input: EligibilityInput) => evaluate(input).rows.map((r) => r.key);
const row = (input: EligibilityInput, key: StandardKey) =>
  evaluate(input).rows.find((r) => r.key === key);

describe('evaluate — the rows it builds', () => {
  it('measures a constable man against every standard, chest included', () => {
    expect(keys(man())).toEqual([
      'height',
      'chest',
      'chestExpansion',
      'run1600m',
      'longJump',
      'shotPut',
    ]);
  });

  // Women are not chest-measured at the PMT, so the two chest rows must not appear at all —
  // an empty row would read as a standard she has not answered and hold her at "incomplete".
  it('leaves the chest rows off a woman entirely', () => {
    expect(keys(woman())).toEqual(['height', 'run800m', 'longJump', 'shotPut']);
    expect(evaluate(woman()).verdict).toBe('eligible');
  });

  // The 100 m is an SI event: a constable is never timed over it, so a stray 100 m value must
  // not produce a row, let alone hold the verdict at "incomplete".
  it('never builds a 100 m row for a constable', () => {
    expect(keys(man({ run100s: 14 }))).not.toContain('run100m');
    expect(evaluate(man({ run100s: 14 })).verdict).toBe('eligible');
  });

  it('carries the required figure from the table into every row', () => {
    expect(row(man(), 'height')?.required).toBe(PC_MALE.height.value);
    expect(row(man(), 'run1600m')?.required).toBe(PC_MALE.run1600m?.value);
    expect(row(woman(), 'run800m')?.required).toBe(PC_FEMALE.run800m?.value);
    expect(row(woman(), 'shotPut')?.required).toBe(PC_FEMALE.shotPut.value);
  });

  it('echoes back what the candidate entered', () => {
    expect(row(man({ heightCm: 171.2 }), 'height')?.actual).toBe(171.2);
  });

  // The screen tags a row whose figure has not been confirmed, so the flag has to travel with
  // the row rather than be looked up again from the table.
  it('says on each row whether its figure is confirmed', () => {
    expect(row(man(), 'height')?.verified).toBe(true);
    expect(row(man({ group: 'st' }), 'height')?.verified).toBe(true);
    expect(row(man({ group: 'st' }), 'chest')?.verified).toBe(false);
    expect(row(siMan(), 'run100m')?.verified).toBe(false);
  });
});

describe('evaluate — boundaries', () => {
  it('passes a minimum met exactly: "not less than 167.6 cm" includes 167.6', () => {
    expect(row(man({ heightCm: 167.6 }), 'height')?.pass).toBe(true);
    expect(row(man({ heightCm: 167.5 }), 'height')?.pass).toBe(false);
  });

  it('passes a limit met exactly: "within 7 min 15 s" includes 435 seconds', () => {
    expect(row(man({ run1600s: 435 }), 'run1600m')?.pass).toBe(true);
    expect(row(man({ run1600s: 435.1 }), 'run1600m')?.pass).toBe(false);
  });

  it('reads the chest and its expansion as two separate standards', () => {
    expect(row(man({ chestCm: 86.3, chestExpansionCm: 5 }), 'chest')?.pass).toBe(true);
    expect(row(man({ chestCm: 86.3, chestExpansionCm: 4.9 }), 'chestExpansion')?.pass).toBe(false);
    expect(row(man({ chestCm: 86.2, chestExpansionCm: 5 }), 'chest')?.pass).toBe(false);
  });

  it('holds a woman to her own run, limit and distances', () => {
    expect(row(woman({ run800s: 320 }), 'run800m')?.pass).toBe(true);
    expect(row(woman({ run800s: 320.5 }), 'run800m')?.pass).toBe(false);
    expect(row(woman({ longJumpM: 2.5 }), 'longJump')?.pass).toBe(true);
    expect(row(woman({ longJumpM: 2.4 }), 'longJump')?.pass).toBe(false);
  });
});

describe('evaluate — missing fields', () => {
  it('leaves an unanswered row undecided rather than failing it', () => {
    const r = row(man({ heightCm: undefined }), 'height');
    expect(r?.actual).toBeUndefined();
    expect(r?.pass).toBeUndefined();
  });

  it('is incomplete while anything is blank and nothing has failed', () => {
    const result = evaluate(man({ shotPutM: undefined }));
    expect(result.verdict).toBe('incomplete');
    expect(result.improve).toEqual([]);
  });

  it('is incomplete on an untouched form', () => {
    const result = evaluate({ post: 'pc', gender: 'male', group: 'general' });
    expect(result.verdict).toBe('incomplete');
    expect(result.rows.every((r) => r.pass === undefined)).toBe(true);
  });

  // A height 8 cm short cannot be undone by filling in the rest, and "incomplete" would send
  // someone to the ground who is not going to be measured through.
  it('lets a confirmed failure outrank a blank field', () => {
    const result = evaluate(man({ heightCm: 160, shotPutM: undefined }));
    expect(result.verdict).toBe('notYet');
    expect(result.improve).toEqual(['height']);
  });
});

describe('evaluate — the verdict', () => {
  it('is eligible only when every standard is answered and met', () => {
    expect(evaluate(man()).verdict).toBe('eligible');
    expect(evaluate(man()).improve).toEqual([]);
  });

  it('lists every shortfall, in measuring order', () => {
    const result = evaluate(man({ heightCm: 160, run1600s: 450, shotPutM: 4 }));
    expect(result.verdict).toBe('notYet');
    expect(result.improve).toEqual(['height', 'run1600m', 'shotPut']);
  });
});

describe('evaluate — the ST / agency relaxation', () => {
  it('measures an ST candidate against the relaxed height', () => {
    const short = { heightCm: 162 };
    expect(evaluate(man(short)).verdict).toBe('notYet');
    expect(evaluate(man({ ...short, group: 'st' })).verdict).toBe('eligible');
    expect(row(man({ ...short, group: 'st' }), 'height')?.required).toBe(PC_MALE_ST.height.value);
  });

  it('relaxes the height for a woman too', () => {
    expect(evaluate(woman({ heightCm: 151 })).verdict).toBe('notYet');
    expect(evaluate(woman({ heightCm: 151, group: 'st' })).verdict).toBe('eligible');
  });

  it('takes the standards handed to it over the ones the input names', () => {
    // The screen resolves the table once and passes it down; the override has to win, or a
    // mismatched pair would silently measure against the wrong column.
    const result = evaluate(man({ heightCm: 162 }), PC_MALE_ST);
    expect(result.verdict).toBe('eligible');
  });
});

describe('evaluate — post', () => {
  it('times an SI applicant over 100 m and 800 m instead of 1600 m', () => {
    expect(keys(siMan())).toEqual([
      'height',
      'chest',
      'chestExpansion',
      'run800m',
      'run100m',
      'longJump',
      'shotPut',
    ]);
    expect(evaluate(siMan()).verdict).toBe('eligible');
  });

  it('holds an SI applicant to the sprint limit', () => {
    expect(row(siMan({ run100s: 15 }), 'run100m')?.pass).toBe(true);
    expect(evaluate(siMan({ run100s: 15.2 })).improve).toEqual(['run100m']);
  });

  it('does not let a constable 1600 m time answer an SI run', () => {
    const result = evaluate(siMan({ run800s: undefined, run1600s: 420 }));
    expect(result.verdict).toBe('incomplete');
    expect(result.rows.find((r) => r.key === 'run800m')?.pass).toBeUndefined();
  });
});

describe('parseMeasure', () => {
  it('reads a plain and a decimal number', () => {
    expect(parseMeasure('167')).toBe(167);
    expect(parseMeasure('167.6')).toBe(167.6);
    expect(parseMeasure(' 5 ')).toBe(5);
  });

  // A Telugu keyboard offers a decimal comma; typing one must not fail the candidate.
  it('accepts a decimal comma', () => {
    expect(parseMeasure('167,6')).toBe(167.6);
  });

  it('treats blank, junk and non-positive entries as unanswered', () => {
    expect(parseMeasure(undefined)).toBeUndefined();
    expect(parseMeasure('')).toBeUndefined();
    expect(parseMeasure('  ')).toBeUndefined();
    expect(parseMeasure('abc')).toBeUndefined();
    expect(parseMeasure('0')).toBeUndefined();
    expect(parseMeasure('-5')).toBeUndefined();
  });
});

describe('toInput', () => {
  it('maps each field onto the standard it answers', () => {
    expect(
      toInput('si', 'male', 'st', {
        height: '170',
        chest: '88',
        chestExpansion: '5',
        run1600m: '430',
        run800m: '165',
        run100m: '14.5',
        longJump: '4.1',
        shotPut: '6.2',
      }),
    ).toEqual({
      post: 'si',
      gender: 'male',
      group: 'st',
      heightCm: 170,
      chestCm: 88,
      chestExpansionCm: 5,
      run1600s: 430,
      run800s: 165,
      run100s: 14.5,
      longJumpM: 4.1,
      shotPutM: 6.2,
    });
  });

  it('passes an empty form through as all-undefined', () => {
    const input = toInput('pc', 'female', 'general', {});
    expect(input).toEqual({ post: 'pc', gender: 'female', group: 'general' });
    expect(evaluate(input).verdict).toBe('incomplete');
  });
});
