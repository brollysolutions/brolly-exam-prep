import { text, tracking, typography } from '@tslprb/design-tokens';

describe('typography()', () => {
  it('English kickers keep their tracking and base size', () => {
    expect(typography('en', 'kicker', '700')).toMatchObject({
      fontFamily: 'Archivo_700Bold',
      fontSize: text.kicker,
      letterSpacing: tracking.kicker,
    });
  });

  it('Telugu keeps every role at its base size and drops the tracking', () => {
    expect(typography('te', 'statLabel').fontSize).toBe(text.statLabel);
    expect(typography('te', 'body').fontSize).toBe(text.body);
    expect(typography('te', 'body').fontFamily).toBe('NotoSansTelugu_400Regular');
    expect(typography('te', 'kicker').letterSpacing).toBe(0);
  });

  it('Telugu has no tracking and a ≥ 1.6 line-height', () => {
    const t = typography('te', 'body');
    expect(t.letterSpacing).toBe(0);
    expect(t.lineHeight / t.fontSize).toBeGreaterThanOrEqual(1.6);
  });

  // A 10.5 px kicker is legible in Archivo's caps; Telugu carries its meaning in marks that
  // disappear at that size, so that face gets its own floor.
  it('kickers have a per-language floor that only lifts the non-Latin face', () => {
    expect(typography('en', 'kicker', '700').fontSize).toBe(text.kicker);
    expect(typography('te', 'kicker', '700').fontSize).toBe(12);
  });

  it('the kicker floor lifts nothing else', () => {
    expect(typography('te', 'caption').fontSize).toBe(text.caption);
    expect(typography('en', 'caption').fontSize).toBe(text.caption);
  });
});
