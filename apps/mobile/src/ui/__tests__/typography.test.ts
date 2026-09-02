import { text, tracking, typography } from '@tslprb/design-tokens';

describe('typography()', () => {
  it('English kickers keep their tracking and base size', () => {
    expect(typography('en', 'kicker', '700')).toMatchObject({
      fontFamily: 'Archivo_700Bold',
      fontSize: text.kicker,
      letterSpacing: tracking.kicker,
    });
  });

  it('Urdu applies bodyDelta and never drops below 12 px', () => {
    expect(typography('ur', 'statLabel').fontSize).toBe(12);
    expect(typography('ur', 'body').fontSize).toBe(text.body + 1);
    expect(typography('ur', 'kicker').letterSpacing).toBe(0);
  });

  it('Telugu has no tracking and a ≥ 1.6 line-height', () => {
    const t = typography('te', 'body');
    expect(t.letterSpacing).toBe(0);
    expect(t.lineHeight / t.fontSize).toBeGreaterThanOrEqual(1.6);
  });

  // A 10.5 px kicker is legible in Archivo's caps; Telugu and Urdu carry their meaning in
  // marks that disappear at that size, so those two faces get their own floor.
  it('kickers have a per-language floor that only lifts the non-Latin faces', () => {
    expect(typography('en', 'kicker', '700').fontSize).toBe(text.kicker);
    expect(typography('te', 'kicker', '700').fontSize).toBe(12);
    expect(typography('ur', 'kicker', '700').fontSize).toBe(13);
  });

  it('the kicker floor lifts nothing else', () => {
    expect(typography('te', 'caption').fontSize).toBe(text.caption);
    expect(typography('en', 'caption').fontSize).toBe(text.caption);
  });
});
