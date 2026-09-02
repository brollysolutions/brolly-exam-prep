import { COST_ROWS } from '@tslprb/fixtures';
import { en, te, ur } from '@tslprb/i18n';

import { startEdge } from '../edge';
import { formatCount, formatDuration, formatRank, isLatinValue } from '../format';

describe('formatDuration', () => {
  it('spells a minute and a remainder', () => {
    expect(formatDuration(82)).toBe('1m 22s');
  });

  it('drops the minute below 60 seconds', () => {
    expect(formatDuration(48)).toBe('48s');
  });

  it('pads the seconds so the column stays tabular', () => {
    expect(formatDuration(124)).toBe('2m 04s');
    expect(formatDuration(60)).toBe('1m 00s');
  });

  it('floors nonsense at zero', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(-5)).toBe('0s');
    expect(formatDuration(Number.NaN)).toBe('0s');
  });
});

describe('formatCount / formatRank', () => {
  it('groups thousands', () => {
    expect(formatCount(9033)).toBe('9,033');
    expect(formatCount(1284)).toBe('1,284');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1000000)).toBe('1,000,000');
  });

  it('renders the rank pool the way the prototype does', () => {
    expect(formatRank(1284, 9033)).toBe('1,284 / 9,033');
  });
});

describe('isLatinValue', () => {
  it('accepts the values Archivo can draw', () => {
    expect(isLatinValue('54%')).toBe(true);
    expect(isLatinValue(COST_ROWS.en[2][1])).toBe(true); // the U+2212 minus
  });

  it('rejects values whose unit is in another script', () => {
    expect(isLatinValue(COST_ROWS.te[1][1])).toBe(false);
    expect(isLatinValue(COST_ROWS.ur[1][1])).toBe(false);
  });
});

describe('startEdge', () => {
  it('puts the bar on the left in LTR and the right in RTL', () => {
    expect(startEdge(false, 'hivis')).toMatchObject({ borderLeftWidth: 3 });
    expect(startEdge(true, 'hivis')).toMatchObject({ borderRightWidth: 3 });
  });
});

describe('locale parity for the screens in this feature', () => {
  const keys = (bundle: unknown, block: 'result' | 'solutions') =>
    Object.keys((bundle as Record<string, Record<string, unknown>>)[block]).sort();

  it.each(['result', 'solutions'] as const)('%s has the same keys in en, te and ur', (block) => {
    expect(keys(te, block)).toEqual(keys(en, block));
    expect(keys(ur, block)).toEqual(keys(en, block));
  });
});
