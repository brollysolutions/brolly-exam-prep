import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { colors, shadow } from '@tslprb/design-tokens';
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

  // Phase B deviation 2: the post step wanted the 12 px corner and `Card` hard-coded `md`, and
  // a second radius class on the same element is the "two competing classes" defect the rules
  // ban. One slot, chosen by the prop.
  it('emits exactly one radius class, md by default and lg on request', async () => {
    await render(<Card title="Constable" testID="md" />);
    expect(screen.getByTestId('md').props.className).toMatch(/\brounded-md\b/);
    expect(screen.getByTestId('md').props.className).not.toMatch(/\brounded-lg\b/);

    await render(<Card title="Constable" radius="lg" testID="lg" />);
    expect(screen.getByTestId('lg').props.className).toMatch(/\brounded-lg\b/);
    expect(screen.getByTestId('lg').props.className).not.toMatch(/\brounded-md\b/);
  });

  // The gold start edge marks the one card per screen that carries it. The card owns the
  // arithmetic: the bar replaces its own 1 px `line` on that side, so only the DIFFERENCE comes
  // off the reading-side padding and the content stays on the axis the cards around it use.
  // Subtracting the whole 3 px is what left an open notice's pill a pixel out of line
  // (fix wave 1, code review 1 / design D8).
  it('draws a start edge and gives back only the pixels it added', async () => {
    await render(<Card title="Worked example" startEdge="accentStrong" testID="edged" />);
    const edged = screen.getByTestId('edged');
    expect(edged.props.style.borderLeftWidth).toBe(3);
    expect(edged.props.style.borderLeftColor).toBe(colors.accentStrong);
    // 16 px of `p-4` minus the two pixels the 3 px bar added over the 1 px border.
    expect(edged.props.style.paddingLeft).toBe(14);
    // The class still says `p-4`: the object style overrides one side, it does not fight it.
    expect(edged.props.className).toMatch(/\bp-4\b/);
  });

  it('lands an edged card content on the same axis as a plain one', async () => {
    await render(
      <>
        <Card title="Plain" testID="plain" />
        <Card title="Edged" startEdge="accentStrong" testID="edged" />
      </>,
    );
    // A plain card: 1 px `line` + 16 px padding. An edged one: 3 px bar + the compensated 14.
    const plain = 1 + 16;
    const edged =
      (screen.getByTestId('edged').props.style.borderLeftWidth as number) +
      (screen.getByTestId('edged').props.style.paddingLeft as number);
    expect(edged).toBe(plain);
  });

  it('compensates the md card tighter box too, and draws nothing without the prop', async () => {
    await render(<Card size="md" title="Tight" startEdge="accentStrong" testID="md" />);
    // `p-3` is 12 px, so the bar leaves 10 and the content still starts on 13.
    expect(screen.getByTestId('md').props.style.paddingLeft).toBe(10);

    await render(<Card title="Plain" testID="plain" />);
    expect(screen.getByTestId('plain').props.style.borderLeftWidth).toBeUndefined();
    expect(screen.getByTestId('plain').props.style.paddingLeft).toBeUndefined();
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
