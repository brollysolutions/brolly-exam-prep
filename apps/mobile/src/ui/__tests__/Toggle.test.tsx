import { colors, radius } from '@tslprb/design-tokens';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { Toggle } from '../Toggle';

beforeAll(() => {
  initI18n('en');
});

describe('Toggle', () => {
  it('reports its state as a switch', async () => {
    await render(<Toggle value onValueChange={jest.fn()} accessibilityLabel="Daily reminder" />);
    const toggle = screen.getByRole('switch', { name: 'Daily reminder' });
    expect(toggle.props.accessibilityState.checked).toBe(true);
  });

  it('asks for the opposite of what it holds', async () => {
    const onValueChange = jest.fn();
    await render(<Toggle value={false} onValueChange={onValueChange} testID="t" />);
    await userEvent.press(screen.getByTestId('t'));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('fills gold with an ink thumb when on, surface2 in a line2 ring with an ink3 thumb when off', async () => {
    const { rerender } = await render(<Toggle value={false} onValueChange={jest.fn()} testID="t" />);
    expect(screen.getByTestId('t')).toHaveStyle({
      backgroundColor: colors.surface2,
      borderColor: colors.line2,
      borderRadius: radius.full,
    });
    expect(screen.getByTestId('t-thumb')).toHaveStyle({ backgroundColor: colors.ink3 });
    await act(async () => rerender(<Toggle value onValueChange={jest.fn()} testID="t" />));
    expect(screen.getByTestId('t')).toHaveStyle({ backgroundColor: colors.accent });
    expect(screen.getByTestId('t-thumb')).toHaveStyle({ backgroundColor: colors.ink });
  });

  it('does not call back while disabled', async () => {
    const onValueChange = jest.fn();
    await render(<Toggle value={false} onValueChange={onValueChange} disabled testID="t" />);
    await userEvent.press(screen.getByTestId('t'));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('travels to the right in English', async () => {
    await render(<Toggle value onValueChange={jest.fn()} testID="t" />);
    // 52 track − 26 thumb − 3 inset.
    expect(screen.getByTestId('t-thumb')).toHaveStyle({ left: 23 });
  });
});
