import { daysUntil, fullDate, shortDate } from '../dates';

describe('daysUntil', () => {
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

  it('counts whole calendar days to the exam', () => {
    expect(daysUntil('2026-10-18', at(2026, 9, 3))).toBe(45);
    expect(daysUntil('2026-10-18', at(2026, 10, 17))).toBe(1);
  });

  /**
   * `new Date('2026-10-18')` is UTC midnight, which is 05:30 in Chennai. Subtract that from a
   * local evening and every candidate reading Home after dark is told the wrong day.
   */
  it('is the same number all day, in the reader’s own timezone', () => {
    const day = [0, 6, 12, 23].map((h) => daysUntil('2026-10-18', at(2026, 9, 3, h)));
    expect(new Set(day).size).toBe(1);
  });

  it('is zero on the day itself and never negative afterwards', () => {
    expect(daysUntil('2026-10-18', at(2026, 10, 18))).toBe(0);
    expect(daysUntil('2026-10-18', at(2026, 11, 1))).toBe(0);
  });

  it('does not throw on a date it cannot read', () => {
    expect(daysUntil('', at(2026, 9, 3))).toBe(0);
    expect(daysUntil('soon', at(2026, 9, 3))).toBe(0);
  });
});

describe('date rendering', () => {
  // Digits, not month names: a numeric date goes through `<Num>` in all three languages,
  // where a translated month would leave the Latin face mid-line.
  it('writes dates day-first, zero-padded', () => {
    expect(shortDate('2026-09-03')).toBe('03-09');
    expect(fullDate('2026-10-18')).toBe('18-10-2026');
  });

  it('hands back anything it cannot parse, rather than inventing a date', () => {
    expect(shortDate('later')).toBe('later');
    expect(fullDate('later')).toBe('later');
  });
});
