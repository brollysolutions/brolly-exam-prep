import { en, te } from '@tslprb/i18n';

import { startEdge } from '../edge';

describe('startEdge', () => {
  it('puts the bar on the left in LTR and the right in RTL', () => {
    expect(startEdge(false, 'hivis')).toMatchObject({ borderLeftWidth: 3 });
    expect(startEdge(true, 'hivis')).toMatchObject({ borderRightWidth: 3 });
  });
});

describe('locale parity for the screens in this feature', () => {
  const keys = (bundle: unknown, block: 'result' | 'solutions') =>
    Object.keys((bundle as Record<string, Record<string, unknown>>)[block]).sort();

  it.each(['result', 'solutions'] as const)('%s has the same keys in en and te', (block) => {
    expect(keys(te, block)).toEqual(keys(en, block));
  });
});
