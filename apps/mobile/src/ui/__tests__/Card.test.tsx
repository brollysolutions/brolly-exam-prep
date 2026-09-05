import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { shadow } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';
import { Text } from 'react-native';

import { Card } from '../Card';

describe('Card', () => {
  beforeAll(() => {
    initI18n('en');
  });

  // A card nobody can press is not an option, so it must not announce one (design review D8).
  it('is a plain view when static: no role, no selection to announce', async () => {
    await render(<Card title="Constable" subtitle="PC" testID="card" />);
    const el = screen.getByTestId('card');
    expect(el.props.accessibilityRole).toBeUndefined();
    expect(el.props.accessibilityState).toBeUndefined();
    expect(screen.getByText('Constable')).toBeOnTheScreen();
  });

  it('rests on surface with a 1 px line and the card shadow', async () => {
    await render(<Card title="Constable" testID="card" />);
    const el = screen.getByTestId('card');
    expect(el.props.className).toMatch(/\bborder\b/);
    expect(el.props.className).toMatch(/\bborder-line\b/);
    expect(el.props.className).toMatch(/\bbg-surface\b/);
    expect(el.props.style).toBeDefined();
    expect(el.props.style.boxShadow).toBe(shadow.card);
    expect(screen.getByText('Constable').props.className).toMatch(/\btext-ink\b/);
  });

  // `accent` measured 2.34:1 against the cream around the card: an edge that IS the state has
  // to clear the 3:1 non-text floor, which `accentStrong` does at 3.37 (design review D2).
  it('selected turns the border 2 px accentStrong on a gold tint; the title stays ink', async () => {
    await render(<Card title="SI / ASI" selected onPress={() => {}} testID="card" />);
    const card = screen.getByTestId('card');
    expect(card.props.className).toMatch(/\bborder-2 border-accentStrong\b/);
    expect(card.props.className).not.toMatch(/\bborder-accent\b/);
    expect(card.props.className).toMatch(/\bbg-accentTint\b/);
    expect(card.props.className).not.toMatch(/\bbg-surface\b/);
    // Gold is a fill, never text: the title keeps its ink at 11:1 on the tint.
    expect(screen.getByText('SI / ASI').props.className).toMatch(/\btext-ink\b/);
  });

  // One of a set, not a switch: the post and category steps are single-choice groups, so the
  // card that carries a `selected` reports `radio` with a checked state (design review D18).
  it('is a radio while it is one option of a choice, and a button otherwise', async () => {
    await render(<Card title="SI / ASI" selected onPress={jest.fn()} testID="on" />);
    expect(screen.getByTestId('on').props.accessibilityRole).toBe('radio');
    expect(screen.getByTestId('on').props.accessibilityState).toEqual({
      checked: true,
      disabled: false,
    });

    await render(<Card title="Constable" selected={false} onPress={jest.fn()} testID="off" />);
    expect(screen.getByTestId('off').props.accessibilityState.checked).toBe(false);

    await render(<Card title="Notice" onPress={jest.fn()} testID="plain" />);
    expect(screen.getByTestId('plain').props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('plain').props.accessibilityState.checked).toBeUndefined();
  });

  it('drops the shadow when flat and renders a trailing slot after the content', async () => {
    await render(
      <Card title="Constable" flat trailing={<Text testID="trail">✓</Text>} testID="card" />,
    );
    const style = screen.getByTestId('card').props.style;
    expect(style).toBeDefined();
    expect(style.boxShadow).toBeUndefined();
    expect(screen.getByTestId('trail')).toBeOnTheScreen();
  });

  it('fills surface2 while held — press feedback is state, not a `style` callback', async () => {
    await render(<Card title="Constable" onPress={jest.fn()} testID="card" />);
    const card = screen.getByTestId('card');
    expect(card.props.className).not.toMatch(/\bbg-surface2\b/);
    await act(async () => {
      fireEvent(card, 'pressIn');
    });
    expect(screen.getByTestId('card').props.className).toMatch(/\bbg-surface2\b/);
    expect(screen.getByTestId('card').props.className).not.toMatch(/\bbg-surface\b/);
    expect(typeof screen.getByTestId('card').props.style).not.toBe('function');
    await act(async () => {
      fireEvent(card, 'pressOut');
    });
    expect(screen.getByTestId('card').props.className).toMatch(/\bbg-surface\b/);
  });

  // A selected card keeps the tint that says "selected" and dims like a filled control
  // instead — otherwise a tap on the chosen post gave nothing back (code review, F-28 fix
  // wave 1, I2).
  it('keeps press feedback when selected: the tint stays and the card dims', async () => {
    await render(<Card title="SI / ASI" selected onPress={jest.fn()} testID="card" />);
    const card = screen.getByTestId('card');
    expect(card).not.toHaveStyle({ opacity: 0.85 });
    await act(async () => {
      fireEvent(card, 'pressIn');
    });
    expect(screen.getByTestId('card')).toHaveStyle({ opacity: 0.85 });
    expect(screen.getByTestId('card').props.className).toMatch(/\bbg-accentTint\b/);
    expect(screen.getByTestId('card').props.className).not.toMatch(/\bbg-surface2\b/);
    await act(async () => {
      fireEvent(card, 'pressOut');
    });
    expect(screen.getByTestId('card')).not.toHaveStyle({ opacity: 0.85 });
  });

  it('reports presses as a button', async () => {
    const onPress = jest.fn();
    await render(<Card title="Constable" onPress={onPress} />);
    const btn = screen.getByRole('button');
    expect(btn).not.toBeDisabled();
    await userEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
