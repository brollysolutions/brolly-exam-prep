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

  it('greys out a disabled primary with panel3 / ghost', async () => {
    await render(<Button label="Continue" disabled testID="btn" />);
    expect(screen.getByTestId('btn').props.className).toContain('bg-panel3');
    expect(screen.getByText('Continue').props.className).toContain('text-ghost');
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
