import { render, screen, userEvent } from '@testing-library/react-native';
import { size } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';
import * as Haptics from 'expo-haptics';

import { Button } from '../Button';

describe('Button', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('renders its label with the button role', async () => {
    await render(<Button label="Continue" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
  });

  it('calls onPress and fires a selection haptic', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" onPress={onPress} />);
    await userEvent.press(screen.getByText('Continue'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('blocks presses when disabled and exposes the state', async () => {
    const onPress = jest.fn();
    await render(<Button label="Continue" onPress={onPress} disabled />);
    await userEvent.press(screen.getByText('Continue'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  // A disabled primary is still the screen's main move, waiting: surface2 in the 3:1 outline
  // ring with an ink3 label (4.7:1), never ink4 at 2.6:1 (design review, F-28 fix wave 1, D8).
  it('greys out a disabled primary as surface2 in an outline ring with an ink3 label', async () => {
    await render(<Button label="Continue" disabled testID="btn" />);
    const btn = screen.getByTestId('btn');
    expect(btn.props.className).toMatch(/\bbg-surface2\b/);
    expect(btn.props.className).toMatch(/\bborder-outline\b/);
    expect(btn.props.className).not.toMatch(/\bbg-ink\b/);
    expect(btn.props.className).not.toMatch(/\bopacity-40\b/);
    expect(screen.getByText('Continue').props.className).toMatch(/\btext-ink3\b/);
    expect(screen.getByText('Continue').props.className).not.toMatch(/\btext-ink4\b/);
  });

  it('fills ink with cream text as primary; the rest are outlines or bare', async () => {
    await render(<Button label="Go" testID="btn" />);
    expect(screen.getByTestId('btn').props.className).toContain('bg-ink');
    expect(screen.getByText('Go').props.className).toContain('text-onInk');
    await screen.rerender(<Button label="Go" variant="secondary" testID="btn" />);
    // The outline is `outline` (3.0:1), not `line2` (1.5:1): a button has to read as one (D3).
    expect(screen.getByTestId('btn').props.className).toMatch(/\bborder-outline\b/);
    expect(screen.getByTestId('btn').props.className).not.toMatch(/\bbg-/);
    expect(screen.getByText('Go').props.className).toMatch(/\btext-ink\b/);
  });

  it('danger is a red outline with red text and no fill of any colour', async () => {
    await render(<Button label="Delete" variant="danger" testID="btn" />);
    const btn = screen.getByTestId('btn');
    // The outline asks; the app never commits in solid red, so no `bg-*` at all — not just no
    // `bg-danger` — is the property that keeps a settings list from growing a second primary.
    expect(btn.props.className).toMatch(/\bborder-dangerInk\b/);
    expect(btn.props.className).not.toMatch(/\bbg-/);
    expect(screen.getByText('Delete').props.className).toMatch(/\btext-dangerInk\b/);
  });

  it('accent is a gold outline that fills gold with ink text when active', async () => {
    await render(<Button label="Mark" variant="accent" testID="btn" />);
    expect(screen.getByTestId('btn').props.className).toContain('border-accentStrong');
    expect(screen.getByText('Mark').props.className).toContain('text-accentInk');
    await screen.rerender(<Button label="Mark" variant="accent" active testID="btn" />);
    expect(screen.getByTestId('btn').props.className).toContain('bg-accent');
    expect(screen.getByText('Mark').props.className).toContain('text-ink');
  });

  it('keeps the old variant names as aliases for one cycle', async () => {
    await render(<Button label="Old" variant="hazard" testID="btn" />);
    expect(screen.getByTestId('btn').props.className).toContain('border-accentStrong');
    await screen.rerender(<Button label="Old" variant="dangerOutline" testID="btn" />);
    expect(screen.getByTestId('btn').props.className).toContain('border-dangerInk');
  });

  it('uses the 56 px height for lg and 48 for md, as an object style', async () => {
    await render(<Button label="Go" size="lg" testID="btn" />);
    const lg = screen.getByTestId('btn');
    expect(lg).toHaveStyle({ height: size.touchLg });
    // Not a `style` CALLBACK: css-interop drops statics declared inside one, which shrank the
    // footer buttons on the web export (review round 1).
    expect(typeof lg.props.style).not.toBe('function');

    await screen.rerender(<Button label="Go" testID="btn" />);
    expect(screen.getByTestId('btn')).toHaveStyle({ height: size.touch });
  });

  it('keeps a caller-supplied width instead of losing it inside a style callback', async () => {
    await render(<Button label="Clear" testID="btn" style={{ width: size.clearBtn }} />);
    expect(screen.getByTestId('btn')).toHaveStyle({ width: 92, height: size.touch });
  });
});
