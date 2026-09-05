import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { Keypad } from '../Keypad';
import { OtpCells } from '../OtpCells';
import { PhoneField } from '../PhoneField';

/**
 * The idle boundary of every entry control is `outline` (3.0:1 on cream, WCAG 1.4.11), not
 * `line2` (1.5:1): a box the candidate is about to type into has to read as a box. Focus is
 * the 3.4:1 gold. (Design review, F-28 fix wave 1, D3.)
 */
describe('entry boxes', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('OtpCells: idle cells in the outline, the next empty one in gold', async () => {
    await render(<OtpCells value="12" testID="otp" />);
    expect(screen.getByTestId('otp-0').props.className).toMatch(/\bborder-outline\b/);
    expect(screen.getByTestId('otp-2').props.className).toMatch(/\bborder-accentStrong\b/);
    expect(screen.getByTestId('otp-2').props.className).not.toMatch(/\bborder-outline\b/);
    expect(screen.getByTestId('otp-5').props.className).not.toMatch(/\bborder-line2\b/);
  });

  it('PhoneField: the prefix box and the empty value box rest in the outline; a filled value box is gold', async () => {
    await render(<PhoneField value="" testID="phone" />);
    expect(screen.getByTestId('phone-prefix').props.className).toMatch(/\bborder-outline\b/);
    expect(screen.getByTestId('phone-value').props.className).toMatch(/\bborder-outline\b/);
    await screen.rerender(<PhoneField value="98765" testID="phone" />);
    expect(screen.getByTestId('phone-value').props.className).toMatch(/\bborder-accentStrong\b/);
    expect(screen.getByTestId('phone-prefix').props.className).toMatch(/\bborder-outline\b/);
  });

  it('Keypad: every key rests as a surface box in the outline and fills surface2 while held', async () => {
    await render(<Keypad onKey={jest.fn()} onDelete={jest.fn()} testID="pad" />);
    const seven = screen.getByRole('button', { name: '7' });
    expect(seven.props.className).toMatch(/\bborder-outline\b/);
    expect(seven.props.className).toMatch(/\bbg-surface\b/);
    await act(async () => {
      fireEvent(seven, 'pressIn');
    });
    expect(screen.getByRole('button', { name: '7' }).props.className).toMatch(/\bbg-surface2\b/);
    expect(screen.getByRole('button', { name: '7' }).props.className).not.toMatch(/\bbg-surface\b/);
  });
});
