import { text, tracking, typography } from '@tslprb/design-tokens';


describe('typography()', () => {
  it('English kickers keep their tracking and base size', () => {
    expect(typography('en', 'kicker', '700')).toMatchObject({
      fontFamily: 'Inter_700Bold',
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

  // A 10.5 px kicker is legible in Inter's caps; Telugu carries its meaning in marks that
  // disappear at that size, so that face gets its own floor.
  it('kickers have a per-language floor that only lifts the non-Latin face', () => {
    expect(typography('en', 'kicker', '700').fontSize).toBe(text.kicker);
    expect(typography('te', 'kicker', '700').fontSize).toBe(12);
  });

  it('the kicker floor lifts nothing else', () => {
    expect(typography('te', 'caption').fontSize).toBe(text.caption);
    expect(typography('en', 'caption').fontSize).toBe(text.caption);
  });

  // Titles, hero lines and the wordmark are Playfair in English: one weight, a tight
  // 1.2 line-height, and the display tracking. Every other role stays Inter.
  it('sets the display roles in Playfair whatever weight is asked for', () => {
    expect(typography('en', 'title', '600')).toEqual({
      fontFamily: 'PlayfairDisplay_400Regular',
      fontSize: text.title,
      lineHeight: 28.8,
      letterSpacing: tracking.display,
    });
    expect(typography('en', 'titleLg').fontFamily).toBe('PlayfairDisplay_400Regular');
    expect(typography('en', 'display', '700').fontFamily).toBe('PlayfairDisplay_400Regular');
    expect(typography('en', 'subtitle', '600').fontFamily).toBe('Inter_600SemiBold');
  });

  it('italic picks the Playfair italic file and the text face ignores it', () => {
    expect(typography('en', 'wordmark', '400', { italic: true })).toMatchObject({
      fontFamily: 'PlayfairDisplay_400Regular_Italic',
      letterSpacing: 0,
    });
    expect(typography('en', 'wordmarkSub', '400', { italic: true }).fontFamily).toBe(
      'PlayfairDisplay_400Regular_Italic',
    );
    expect(typography('en', 'body', '400', { italic: true }).fontFamily).toBe('Inter_400Regular');
  });

  it('numbers never leave Inter, even at display size', () => {
    expect(typography('en', 'display', '700', { numeric: true })).toEqual({
      fontFamily: 'Inter_700Bold',
      fontSize: text.display,
      lineHeight: 45,
      letterSpacing: 0,
    });
  });

  it('carries the 800 weight in both faces', () => {
    expect(typography('en', 'body', '800').fontFamily).toBe('Inter_800ExtraBold');
    expect(typography('te', 'body', '800').fontFamily).toBe('NotoSansTelugu_800ExtraBold');
  });

  // Playfair has no Telugu: the display roles fall back to Noto at 700 on the usual
  // 1.65 line-height, so a Telugu title never reads lighter than its English twin.
  it('sets Telugu display roles in Noto 700 (or the 800 asked for)', () => {
    expect(typography('te', 'title', '600')).toEqual({
      fontFamily: 'NotoSansTelugu_700Bold',
      fontSize: text.title,
      lineHeight: 39.6,
      letterSpacing: 0,
    });
    expect(typography('te', 'title', '800').fontFamily).toBe('NotoSansTelugu_800ExtraBold');
  });
});
