import { standardsFor } from '@tslprb/fixtures';

import { evaluate, toInput } from '../evaluate';
import { formatRunTime, isLongRun, joinRunTime, splitRunTime } from '../runTime';

describe('joinRunTime', () => {
  it('turns minutes and seconds into the seconds the checker reads', () => {
    expect(joinRunTime('7', '15')).toBe('435');
    expect(joinRunTime('5', '20')).toBe('320');
    expect(joinRunTime('2', '50')).toBe('170');
  });

  // The whole point (review I4): 7 min 15 s is the limit, 7 min 16 s is over it, and neither
  // can be mistaken for seven-and-a-bit seconds.
  it('lands on either side of the 1600 m limit', () => {
    const standards = standardsFor('pc', 'male', 'general');
    const at = (min: string, sec: string) =>
      evaluate(
        toInput('pc', 'male', 'general', { run1600m: joinRunTime(min, sec) }),
        standards,
      ).rows.find((r) => r.key === 'run1600m')?.pass;
    expect(at('7', '15')).toBe(true);
    expect(at('7', '16')).toBe(false);
  });

  it('reads blank seconds beside filled minutes as m:00', () => {
    expect(joinRunTime('7', '')).toBe('420');
    expect(joinRunTime('7', '  ')).toBe('420');
  });

  it('reads blank minutes beside filled seconds as seconds alone', () => {
    expect(joinRunTime('', '45')).toBe('45');
  });

  it('is blank when both fields are blank, and when either holds junk', () => {
    expect(joinRunTime('', '')).toBe('');
    expect(joinRunTime('a', '15')).toBe('');
    expect(joinRunTime('7', 'x')).toBe('');
    expect(joinRunTime('-1', '15')).toBe('');
  });

  // Review fix1 #7: neither field is a fraction of a minute or second here — a decimal in
  // either one (a web hardware keyboard can type "7.1" where a numeric pad would not) makes
  // the whole entry blank, same as any other junk. The 100 m sprint's own field goes through
  // `parseMeasure` (evaluate.ts), a different path, and keeps its decimals.
  it('rejects a decimal in the minutes field', () => {
    expect(joinRunTime('7.1', '15')).toBe('');
  });

  it('rejects a decimal in the seconds field', () => {
    expect(joinRunTime('7', '15,5')).toBe('');
    expect(joinRunTime('7', '15.5')).toBe('');
  });
});

describe('splitRunTime', () => {
  it('turns stored seconds back into the two fields', () => {
    expect(splitRunTime('435')).toEqual({ min: '7', sec: '15' });
    expect(splitRunTime('420')).toEqual({ min: '7', sec: '00' });
    expect(splitRunTime('435.5')).toEqual({ min: '7', sec: '15.5' });
  });

  it('is blank for nothing, and seconds-only for under a minute', () => {
    expect(splitRunTime(undefined)).toEqual({ min: '', sec: '' });
    expect(splitRunTime('')).toEqual({ min: '', sec: '' });
    expect(splitRunTime('45')).toEqual({ min: '', sec: '45' });
    // A legacy "7.15" typed as seconds shows up where it is visibly wrong.
    expect(splitRunTime('7.15')).toEqual({ min: '', sec: '7.15' });
  });

  it('round-trips what the fields produce', () => {
    for (const [min, sec] of [
      ['7', '15'],
      ['5', '20'],
      ['12', '05'],
    ]) {
      expect(splitRunTime(joinRunTime(min, sec))).toEqual({ min, sec });
    }
  });
});

describe('formatRunTime', () => {
  it('prints a limit the way the notification does', () => {
    expect(formatRunTime(435)).toBe('7:15');
    expect(formatRunTime(320)).toBe('5:20');
    expect(formatRunTime(170)).toBe('2:50');
    expect(formatRunTime(600)).toBe('10:00');
  });

  it('keeps a decimal second and survives nonsense', () => {
    expect(formatRunTime(435.5)).toBe('7:15.5');
    expect(formatRunTime(Number.NaN)).toBe('0:00');
    expect(formatRunTime(-3)).toBe('0:00');
  });
});

describe('isLongRun', () => {
  it('names the two mm:ss events and leaves the sprint in seconds', () => {
    expect(isLongRun('run1600m')).toBe(true);
    expect(isLongRun('run800m')).toBe(true);
    expect(isLongRun('run100m')).toBe(false);
    expect(isLongRun('height')).toBe(false);
  });
});
