import { render, screen, userEvent } from '@testing-library/react-native';
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

  it('uses the 56 px height for lg', async () => {
    await render(<Button label="Go" size="lg" testID="btn" />);
    expect(screen.getByTestId('btn').props.className).toContain('h-touchLg');
  });
});
