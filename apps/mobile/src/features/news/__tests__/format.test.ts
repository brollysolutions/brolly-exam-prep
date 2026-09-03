import { formatDay, isIsoDay } from '../format';

describe('isIsoDay', () => {
  it('accepts a real calendar day', () => {
    expect(isIsoDay('2026-08-04')).toBe(true);
    expect(isIsoDay('2026-12-31')).toBe(true);
    // A leap day in a leap year, and the same date in a common one.
    expect(isIsoDay('2024-02-29')).toBe(true);
    expect(isIsoDay('2026-02-29')).toBe(false);
    // 2000 is a leap year (÷400), 1900 is not (÷100).
    expect(isIsoDay('2000-02-29')).toBe(true);
    expect(isIsoDay('1900-02-29')).toBe(false);
  });

  it('rejects anything that is not a `YYYY-MM-DD` day', () => {
    for (const bad of [
      '',
      '2026-8-4',
      '2026/08/04',
      '2026-08-04T10:00:00Z',
      '2026-13-01',
      '2026-00-10',
      '2026-04-31',
      '2026-08-32',
      'tomorrow',
    ]) {
      expect(isIsoDay(bad)).toBe(false);
    }
  });
});

describe('formatDay', () => {
  it('prints `d MMM yyyy`, with no leading zero on the day', () => {
    expect(formatDay('2026-08-04')).toBe('4 Aug 2026');
    expect(formatDay('2026-10-24')).toBe('24 Oct 2026');
    expect(formatDay('2026-01-01')).toBe('1 Jan 2026');
    expect(formatDay('2026-12-09')).toBe('9 Dec 2026');
  });

  it('names every month', () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      formatDay(`2026-${String(i + 1).padStart(2, '0')}-15`),
    );
    expect(months).toEqual([
      '15 Jan 2026',
      '15 Feb 2026',
      '15 Mar 2026',
      '15 Apr 2026',
      '15 May 2026',
      '15 Jun 2026',
      '15 Jul 2026',
      '15 Aug 2026',
      '15 Sep 2026',
      '15 Oct 2026',
      '15 Nov 2026',
      '15 Dec 2026',
    ]);
  });

  // `new Date('2026-08-04')` is UTC midnight; printed in any zone west of Greenwich that is
  // the 3rd, which would silently date a notice a day early for a whole hemisphere. The
  // helper never builds a Date, so the day it prints is the day the string carries.
  it('never shifts a day, whatever the device time zone is', () => {
    expect(formatDay('2026-08-04')).toBe('4 Aug 2026');
    expect(new Date('2026-08-04').getTime()).toBe(Date.UTC(2026, 7, 4));
  });

  it('hands back a value it cannot read, rather than inventing one', () => {
    expect(formatDay('2026-02-30')).toBe('2026-02-30');
    expect(formatDay('not a date')).toBe('not a date');
    expect(formatDay('')).toBe('');
  });
});
