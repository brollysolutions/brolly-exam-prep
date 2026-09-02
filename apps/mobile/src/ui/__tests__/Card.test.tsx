import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { Card } from '../Card';

describe('Card', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('is a plain, non-disabled view when static (no onPress)', async () => {
    await render(<Card title="Constable" subtitle="PC" testID="card" />);
    const el = screen.getByTestId('card');
    expect(el.props.accessibilityRole).toBeUndefined();
    expect(el.props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByText('Constable')).toBeOnTheScreen();
  });

  it('selected turns the title hi-vis and the border 2 px', async () => {
    await render(<Card title="SI / ASI" selected onPress={() => {}} testID="card" />);
    expect(screen.getByTestId('card').props.className).toContain('border-2 border-hivis');
    expect(screen.getByText('SI / ASI').props.className).toContain('text-hivis');
  });

  it('reports presses and the selected state as a button', async () => {
    const onPress = jest.fn();
    await render(<Card title="Constable" onPress={onPress} />);
    const btn = screen.getByRole('button');
    expect(btn).not.toBeDisabled();
    await userEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
