import { render, screen } from '@testing-library/react-native';
import { spacing } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';

import { Num } from '../Num';
import { Pill } from '../Pill';

describe('Pill', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('rests quiet: a surface2 capsule with a hairline and an ink3 label', async () => {
    await render(<Pill label="Sample data" testID="pill" />);
    const pill = screen.getByTestId('pill');
    expect(pill.props.className).toMatch(/\brounded-full\b/);
    expect(pill.props.className).toMatch(/\bbg-surface2\b/);
    expect(pill.props.className).toMatch(/\bborder-line\b/);
    expect(screen.getByText('Sample data').props.className).toMatch(/\btext-ink3\b/);
  });

  it('carries ink on the gold tint and cream on ink — gold is never the label', async () => {
    await render(<Pill label="Answered" tone="gold" testID="gold" />);
    expect(screen.getByTestId('gold').props.className).toMatch(/\bbg-accentTint\b/);
    expect(screen.getByTestId('gold').props.className).toMatch(/\bborder-accentStrong\b/);
    expect(screen.getByText('Answered').props.className).toMatch(/\btext-ink\b/);

    await render(<Pill label="Marked" tone="ink" testID="ink" />);
    expect(screen.getByTestId('ink').props.className).toMatch(/\bbg-ink\b/);
    expect(screen.getByText('Marked').props.className).toMatch(/\btext-onInk\b/);
  });

  it('draws a 6 px dot in the tone’s own gold, and none unless asked', async () => {
    await render(<Pill label="Today" dot testID="pill" />);
    expect(screen.getByTestId('pill-dot').props.className).toMatch(/\bbg-accentStrong\b/);
    expect(screen.getByTestId('pill-dot').props.className).toMatch(/\bh-1\.5 w-1\.5\b/);

    await render(<Pill label="Today" testID="bare" />);
    expect(screen.queryByTestId('bare-dot')).toBeNull();
  });

  it('lights the dot in `accent` on the ink fill, where the strong gold would sink', async () => {
    await render(<Pill label="Marked" tone="ink" dot testID="pill" />);
    expect(screen.getByTestId('pill-dot').props.className).toMatch(/\bbg-accent\b/);
  });

  it('takes a <Num> before the label, so the step counter stays tabular and LTR', async () => {
    await render(<Pill label="Post" leading={<Num variant="caption">{'1 / 2'}</Num>} />);
    expect(screen.getByText('⁦1 / 2⁩')).toHaveStyle({ fontFamily: 'Inter_700Bold' });
  });

  it('grows with its label instead of clipping: a minimum height, never a fixed one', async () => {
    await render(<Pill label="Sample data" testID="pill" />);
    const style = screen.getByTestId('pill').props.style;
    expect(style.minHeight).toBe(spacing['6']);
    expect(style.height).toBeUndefined();
  });

  // A pill is a label. The pressable filter is `Chip shape="pill"`, which reports a button
  // role and a selected state; a pill that could be pressed would look identical and do
  // nothing.
  it('is never a control', async () => {
    await render(<Pill label="Free" testID="pill" />);
    const pill = screen.getByTestId('pill');
    expect(pill.props.accessibilityRole).toBeUndefined();
    expect(pill.props.onPress).toBeUndefined();
  });

  // A pill hugs its label, so it opts out of a Stack's stretch itself — and it emits exactly
  // one alignment class, never both. `self-start` is physical, so the reading edge goes
  // through `dir()` and an RTL language gets `self-end` without the pill knowing (M3/D12).
  it('hugs the reading edge, or the middle of a centred block', async () => {
    await render(<Pill label="Step" testID="pill" />);
    expect(screen.getByTestId('pill').props.className).toMatch(/\bself-start\b/);

    await render(<Pill label="Step" align="center" testID="mid" />);
    expect(screen.getByTestId('mid').props.className).toMatch(/\bself-center\b/);
    expect(screen.getByTestId('mid').props.className).not.toMatch(/\bself-start\b/);
  });

  // The dot is the status, not decoration: a heading that is not a state asks for `none`, a
  // failure asks for `danger`. Fills never move — only the dot changes colour (M9 / D7).
  it('takes the dot’s tone without touching the fill', async () => {
    await render(<Pill label="Could not load" dot dotTone="danger" testID="bad" />);
    expect(screen.getByTestId('bad').props.className).toMatch(/\bbg-surface2\b/);
    expect(screen.getByTestId('bad-dot').props.className).toMatch(/\bbg-dangerInk\b/);

    await render(<Pill label="Eligible" dot dotTone="ok" testID="good" />);
    expect(screen.getByTestId('good-dot').props.className).toMatch(/\bbg-okInk\b/);
  });

  // Section headings are not status (ruling M14): the pill names a block and carries no dot.
  it('draws no dot at all for `none`, even when one was asked for', async () => {
    await render(<Pill label="Updates" dot dotTone="none" testID="head" />);
    expect(screen.queryByTestId('head-dot')).toBeNull();
  });

  // `ink3` is 4.7:1 on surface2: the rule is that nothing at that ratio goes below caption.
  it('sets the label at caption size, not the 10.5 px kicker', async () => {
    await render(<Pill label="Sample data" />);
    expect(screen.getByText('Sample data')).toHaveStyle({ fontSize: 12 });
  });
});
