import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { Chip } from '../Chip';

describe('Chip', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('is a plain view when static: no role, no selection to announce', async () => {
    await render(<Chip label="Marked" active tone="accent" testID="chip" />);
    const el = screen.getByTestId('chip');
    expect(el.props.accessibilityRole).toBeUndefined();
    // A badge nobody can choose must not announce "selected" (design review D8): the word is
    // the state, and a reader that hears "Marked, selected" hears a control that is not there.
    expect(el.props.accessibilityState).toBeUndefined();
    expect(el.props.className).toMatch(/\bbg-accentSoft\b/);
    expect(screen.getByText('Marked').props.className).toMatch(/\btext-ink\b/);
  });

  // Three tones and no more: `label` and the pre-rebrand `hivis`/`hazard`/`sand`/`flag` names
  // left with Phase E (F-32), and the compiler is what pins that now.
  it('tones: danger is a red tint with red text, ok a green fill with ink', async () => {
    await render(<Chip label="Wrong" active tone="danger" testID="chip" />);
    expect(screen.getByTestId('chip').props.className).toMatch(/\bbg-dangerTint border-dangerInk\b/);
    expect(screen.getByText('Wrong').props.className).toMatch(/\btext-dangerInk\b/);
    await screen.rerender(<Chip label="Eligible" active tone="ok" testID="chip" />);
    expect(screen.getByTestId('chip').props.className).toMatch(/\bbg-ok\b/);
    expect(screen.getByText('Eligible').props.className).toMatch(/\btext-ink\b/);
    await screen.rerender(<Chip label="Answered" active tone="accent" testID="chip" />);
    expect(screen.getByTestId('chip').props.className).toMatch(/\bbg-accentSoft\b/);
  });

  // The rest border is `outline` (3.0:1, WCAG 1.4.11), not `line2` (1.5:1): a filter the
  // candidate can tap has to read as a control. (Design review, F-28 fix wave 1, D3.)
  it('rests as an outline with an ink3 label', async () => {
    await render(<Chip label="Free" testID="chip" />);
    expect(screen.getByTestId('chip').props.className).toMatch(/\bborder-outline\b/);
    expect(screen.getByTestId('chip').props.className).not.toMatch(/\bborder-line2\b/);
    expect(screen.getByText('Free').props.className).toMatch(/\btext-ink3\b/);
  });

  // `ink4` was 2.8:1 (D2): a locked tab still has to be read to be understood as locked.
  // The step-down is the weight (600 → 500), and the colour stays at the ink3 floor.
  it('muted steps the weight down, never the colour below ink3', async () => {
    await render(<Chip label="Free" muted testID="chip" />);
    const label = screen.getByText('Free');
    expect(label.props.className).toMatch(/\btext-ink3\b/);
    expect(label.props.className).not.toMatch(/\btext-ink4\b/);
    expect(label).toHaveStyle({ fontFamily: 'Inter_500Medium' });
    await screen.rerender(<Chip label="Free" testID="chip" />);
    expect(screen.getByText('Free')).toHaveStyle({ fontFamily: 'Inter_600SemiBold' });
  });

  // Soft gold sits 1.38:1 from the canvas (D4): the selected chip carries a 2 px inner bottom
  // edge in the 3.4:1 gold so the state survives on any cream.
  it('selected carries a 2 px accentStrong bottom edge; resting does not', async () => {
    await render(<Chip label="Previous" active testID="chip" />);
    expect(screen.getByTestId('chip').props.className).toMatch(/\bborder-b-2\b/);
    expect(screen.getByTestId('chip').props.className).toMatch(/\bborder-b-accentStrong\b/);
    await screen.rerender(<Chip label="Previous" testID="chip" />);
    expect(screen.getByTestId('chip').props.className).not.toMatch(/\bborder-b-2\b/);
    expect(screen.getByTestId('chip').props.className).not.toMatch(/\bborder-b-accentStrong\b/);
  });

  it('shape="pill" is fully round; the default is the 4 px tag corner', async () => {
    await render(<Chip label="Previous" shape="pill" testID="chip" />);
    expect(screen.getByTestId('chip').props.className).toMatch(/\brounded-full\b/);
    expect(screen.getByTestId('chip').props.className).not.toMatch(/\brounded-xs\b/);
    await screen.rerender(<Chip label="Previous" testID="chip" />);
    expect(screen.getByTestId('chip').props.className).toMatch(/\brounded-xs\b/);
  });

  it('is a button that reports presses when interactive', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Free" onPress={onPress} />);
    await userEvent.press(screen.getByRole('button', { name: 'Free' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a count as an isolated, tabular <Num> beside the label', async () => {
    await render(<Chip label="Wrong" count={3} testID="chip" />);
    const el = screen.getByTestId('chip');
    // The tally is wrapped in LRI ... PDI, so it never re-orders inside an RTL line.
    const [LRI, PDI] = [String.fromCharCode(0x2066), String.fromCharCode(0x2069)];
    expect(el).toHaveTextContent(`Wrong${LRI}(3)${PDI}`);
  });

  it('only reports disabled when actually disabled', async () => {
    await render(<Chip label="Locked" onPress={() => {}} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  // A tall face at chip size is a line box plus overhang: a fixed 34 px chip clips it
  // (design review, F-23-25). The size is a floor, and the padding is what keeps it a chip.
  it('sizes by a minimum height with vertical padding, never a fixed box', async () => {
    await render(<Chip label="Notification" testID="chip" />);
    const el = screen.getByTestId('chip');
    expect(el.props.className).toMatch(/\bmin-h-chip\b/);
    expect(el.props.className).toMatch(/\bpy-1\b/);
    expect(el.props.className).not.toMatch(/(^|\s)h-chip(\s|$)/);
  });

  it.each([
    ['md', 'min-h-chipMd'],
    ['lg', 'min-h-touch'],
  ] as const)('keeps the %s floor', async (size, cls) => {
    await render(<Chip label="Sign in" size={size} testID="chip" />);
    expect(screen.getByTestId('chip').props.className).toContain(cls);
  });

  // The `label` tone drew a borderless 10.5 px kicker on `surface2` — a tag, not a control,
  // and below the caption floor `ink3` is held to. `Pill` has drawn every product tag since
  // Phase C and Phase E (F-32) deleted the tone, so a `Chip` is now always a bordered box:
  // there is no shape it can take that is not a control or a badge with a boundary.
  it('always draws a bordered box, whatever tone it is given', async () => {
    for (const tone of ['accent', 'danger', 'ok'] as const) {
      await render(<Chip label="Tag" tone={tone} testID="chip" />);
      expect(screen.getByTestId('chip').props.className).toMatch(/\bborder\b/);
      expect(screen.getByText('Tag')).toHaveStyle({ fontSize: 13 });
    }
  });
});
