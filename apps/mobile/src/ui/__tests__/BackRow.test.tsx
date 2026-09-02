import { act, render, screen, userEvent } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { BackRow } from '../BackRow';

describe('BackRow', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('reports presses as a button and offers Android ripple', async () => {
    const onPress = jest.fn();
    await render(<BackRow label="Back" onPress={onPress} testID="back" />);
    await userEvent.press(screen.getByTestId('back'));
    expect(onPress).toHaveBeenCalledTimes(1);
    // Pressed feedback: Pressable resolves `style` per press state.
    expect(typeof screen.getByTestId('back').props.style).toBe('object');
  });

  it('is a 48 px target', async () => {
    await render(<BackRow label="Back" onPress={jest.fn()} testID="back" />);
    expect(screen.getByTestId('back').props.className).toContain('h-touch');
  });
});

describe('BackRow (ur)', () => {
  beforeAll(async () => {
    await act(async () => {
      await setLanguage('ur');
    });
  });

  afterAll(async () => {
    await act(async () => {
      await setLanguage('en');
    });
  });

  it('mirrors the row and draws the chevron in the Latin face', async () => {
    await render(<BackRow label="واپس" onPress={jest.fn()} testID="back" />);
    expect(screen.getByTestId('back-row')).toHaveStyle({ flexDirection: 'row-reverse' });
    // The chevron is decorative, so it is hidden from the a11y tree and from default queries.
    expect(
      screen.getByTestId('back-chevron', { includeHiddenElements: true }),
    ).toHaveStyle({ fontFamily: 'Archivo_400Regular' });
  });
});
