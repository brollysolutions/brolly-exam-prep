import { en, te } from '@tslprb/i18n';

import { startEdge, startEdgeInset } from '../edge';

describe('startEdge', () => {
  it('puts the bar on the left in LTR and the right in RTL', () => {
    expect(startEdge(false, 'hivis')).toMatchObject({ borderLeftWidth: 3 });
    expect(startEdge(true, 'hivis')).toMatchObject({ borderRightWidth: 3 });
  });
});

describe('startEdgeInset', () => {
  // The bar replaces the boundary that side already had, so only the difference comes off the
  // padding. Subtracting the whole 3 px is the defect that left an open notice's pill a pixel
  // out of line with the closed cards around it (fix wave 1, code review 1).
  it('gives back only the pixels the edge added over the box own border', () => {
    // A bare box (a paper option): nothing there before, so the whole edge comes off.
    expect(startEdgeInset(false, 12)).toEqual({ paddingLeft: 9 });
    // A card: 3 px of gold over its 1 px `line` is two pixels.
    expect(startEdgeInset(false, 16, 1)).toEqual({ paddingLeft: 14 });
    // A selected card, whose resting border is already 2 px.
    expect(startEdgeInset(false, 15, 2)).toEqual({ paddingLeft: 14 });
  });

  it('pads the reading side, so it mirrors with the language', () => {
    expect(startEdgeInset(true, 16, 1)).toEqual({ paddingRight: 14 });
    expect(startEdgeInset(true, 12)).toEqual({ paddingRight: 9 });
  });

  // The whole point: text inside a box with the edge lands on the same axis as text inside one
  // without it. `border + padding` is the inset in both.
  it('lands the content on the axis a plain card starts its own on', () => {
    const plain = 1 + 16;
    const edged = 3 + (startEdgeInset(false, 16, 1).paddingLeft as number);
    expect(edged).toBe(plain);
  });
});

describe('locale parity for the screens in this feature', () => {
  const keys = (bundle: unknown, block: 'result' | 'solutions') =>
    Object.keys((bundle as Record<string, Record<string, unknown>>)[block]).sort();

  it.each(['result', 'solutions'] as const)('%s has the same keys in en and te', (block) => {
    expect(keys(te, block)).toEqual(keys(en, block));
  });
});
