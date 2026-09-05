import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { BackRow } from '../BackRow';

describe('BackRow', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('reports presses as a button', async () => {
    const onPress = jest.fn();
    await render(<BackRow label="Back" onPress={onPress} testID="back" />);
    await userEvent.press(screen.getByTestId('back'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('fills surface2 while held — press feedback is state, not a `style` callback', async () => {
    await render(<BackRow label="Back" onPress={jest.fn()} testID="back" />);
    const row = screen.getByTestId('back');
    // Opacity is invisible on cream (see `pressedClass`): the row swaps its fill instead.
    expect(row.props.className).not.toMatch(/\bbg-surface2\b/);
    await act(async () => {
      fireEvent(row, 'pressIn');
    });
    expect(screen.getByTestId('back').props.className).toMatch(/\bbg-surface2\b/);
    expect(typeof screen.getByTestId('back').props.style).not.toBe('function');
    await act(async () => {
      fireEvent(row, 'pressOut');
    });
    expect(screen.getByTestId('back').props.className).not.toMatch(/\bbg-surface2\b/);
  });

  it('is a 48 px target', async () => {
    await render(<BackRow label="Back" onPress={jest.fn()} testID="back" />);
    expect(screen.getByTestId('back').props.className).toMatch(/\bh-touch\b/);
  });
});

describe('BackRow (te)', () => {
  beforeAll(async () => {
    await act(async () => {
      await setLanguage('te');
    });
  });

  afterAll(async () => {
    await act(async () => {
      await setLanguage('en');
    });
  });

  it('sets the label in Telugu and draws the chevron in the Latin face', async () => {
    await render(<BackRow label="వెనుకకు" onPress={jest.fn()} testID="back" />);
    expect(screen.getByTestId('back-row')).toHaveStyle({ flexDirection: 'row' });
    expect(screen.getByText('వెనుకకు')).toHaveStyle({ fontFamily: 'NotoSansTelugu_600SemiBold' });
    // The chevron is decorative, so it is hidden from the a11y tree and from default queries.
    expect(
      screen.getByTestId('back-chevron', { includeHiddenElements: true }),
    ).toHaveStyle({ fontFamily: 'Inter_400Regular' });
  });
});
