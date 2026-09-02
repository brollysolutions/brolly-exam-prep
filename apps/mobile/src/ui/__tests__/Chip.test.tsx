import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { Chip } from '../Chip';

describe('Chip', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('is a plain, non-disabled view when static (no onPress)', async () => {
    await render(<Chip label="Marked" active tone="hazard" testID="chip" />);
    const el = screen.getByTestId('chip');
    expect(el.props.accessibilityRole).toBeUndefined();
    expect(el.props.accessibilityState).toEqual({ selected: true });
    expect(el.props.className).toContain('bg-hazard');
  });

  it('is a button that reports presses when interactive', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Free" onPress={onPress} />);
    await userEvent.press(screen.getByRole('button', { name: 'Free' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('only reports disabled when actually disabled', async () => {
    await render(<Chip label="Locked" onPress={() => {}} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
