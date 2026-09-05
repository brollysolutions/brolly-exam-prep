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

  it('dims while held — press feedback is state, not a `style` callback', async () => {
    await render(<BackRow label="Back" onPress={jest.fn()} testID="back" />);
    const row = screen.getByTestId('back');
    expect(row).not.toHaveStyle({ opacity: 0.8 });
    await act(async () => {
      fireEvent(row, 'pressIn');
    });
    expect(screen.getByTestId('back')).toHaveStyle({ opacity: 0.8 });
    await act(async () => {
      fireEvent(row, 'pressOut');
    });
    expect(screen.getByTestId('back')).not.toHaveStyle({ opacity: 0.8 });
  });

  it('is a 48 px target', async () => {
    await render(<BackRow label="Back" onPress={jest.fn()} testID="back" />);
    expect(screen.getByTestId('back').props.className).toContain('h-touch');
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
    ).toHaveStyle({ fontFamily: 'Archivo_400Regular' });
  });
});
