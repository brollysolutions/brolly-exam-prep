import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { iso } from '@/ui';
import * as haptics from '@/ui/haptics';

import { OtpView } from '../OtpView';

const T0 = Date.parse('2026-09-02T10:00:00.000Z');

/** Fresh spies for the callbacks a case does not care about. */
const noops = () => ({ onResend: jest.fn(), onChangeNumber: jest.fn() });

const type = async (digits: string) => {
  for (const d of digits) await userEvent.press(screen.getByLabelText(d));
};

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(T0);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('OtpView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('keeps verify disabled until six digits are entered', async () => {
    await render(<OtpView phone="9000012345" onVerify={jest.fn()} {...noops()} />);
    expect(screen.getByTestId('otp-verify')).toBeDisabled();
    await type('12345');
    expect(screen.getByTestId('otp-verify')).toBeDisabled();
    await type('6');
    expect(screen.getByTestId('otp-verify')).toBeEnabled();
  });

  it('shows the phone the code went to, grouped and LTR', async () => {
    await render(<OtpView phone="9000012345" onVerify={jest.fn()} {...noops()} />);
    expect(screen.getByTestId('otp-phone')).toBeOnTheScreen();
    expect(screen.getByText(iso('+91 90000 12345'))).toBeOnTheScreen();
  });

  it('falls back to the mask when the number is unknown', async () => {
    await render(<OtpView phone="" onVerify={jest.fn()} {...noops()} />);
    expect(screen.getByText(iso('+91 00000 00000'))).toBeOnTheScreen();
  });

  it('counts down and turns resend into a button at zero', async () => {
    const onResend = jest.fn();
    await render(<OtpView phone="9000012345" onVerify={jest.fn()} {...noops()} onResend={onResend} />);
    expect(within(screen.getByTestId('otp-resend-line')).getByText(iso('24'))).toBeOnTheScreen();
    expect(screen.queryByTestId('otp-resend')).toBeNull();

    await advance(1000);
    expect(within(screen.getByTestId('otp-resend-line')).getByText(iso('23'))).toBeOnTheScreen();

    await advance(23_000);
    expect(screen.queryByTestId('otp-resend-line')).toBeNull();
    await userEvent.press(screen.getByTestId('otp-resend'));
    expect(onResend).toHaveBeenCalled();
    // The countdown re-arms for the next attempt.
    expect(within(screen.getByTestId('otp-resend-line')).getByText(iso('24'))).toBeOnTheScreen();
  });

  it('arms the resend at once when the caller says the request is spent', async () => {
    await render(<OtpView phone="9000012345" resendSeconds={0} onVerify={jest.fn()} {...noops()} />);
    expect(screen.getByTestId('otp-resend')).toBeOnTheScreen();
    expect(screen.queryByTestId('otp-resend-line')).toBeNull();
  });

  it('re-arms the full wait when the clock was opened at zero', async () => {
    await render(<OtpView phone="9000012345" resendSeconds={0} onVerify={jest.fn()} {...noops()} />);
    await userEvent.press(screen.getByTestId('otp-resend'));
    expect(within(screen.getByTestId('otp-resend-line')).getByText(iso('24'))).toBeOnTheScreen();
  });

  it('clears a half-typed code when the code is resent', async () => {
    await render(<OtpView phone="9000012345" resendSeconds={0} onVerify={jest.fn()} {...noops()} />);
    await type('123');
    expect(within(screen.getByTestId('otp-cells')).getByText(iso('1'))).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId('otp-resend'));
    expect(within(screen.getByTestId('otp-cells')).queryByText(iso('1'))).toBeNull();
  });

  it('verifies the code it collected', async () => {
    const onVerify = jest.fn(() => true);
    await render(<OtpView phone="9000012345" onVerify={onVerify} {...noops()} />);
    await type('123456');
    await userEvent.press(screen.getByTestId('otp-verify'));
    expect(onVerify).toHaveBeenCalledWith('123456');
    expect(screen.getByTestId('otp-cells')).toHaveAccessibilityValue({ text: '123456' });
  });

  it('clears the cells and buzzes a warning when the code is rejected', async () => {
    const warning = jest.spyOn(haptics, 'warning');
    const onVerify = jest.fn(() => Promise.resolve(false));
    await render(<OtpView phone="9000012345" onVerify={onVerify} {...noops()} />);
    await type('111111');
    await userEvent.press(screen.getByTestId('otp-verify'));
    expect(onVerify).toHaveBeenCalledWith('111111');
    expect(within(screen.getByTestId('otp-cells')).queryByText(iso('1'))).toBeNull();
    expect(screen.getByTestId('otp-verify')).toBeDisabled();
    expect(warning).toHaveBeenCalledTimes(1);
    warning.mockRestore();
  });

  it('shows the error toast the caller passes', async () => {
    await render(
      <OtpView phone="9000012345" error="That code has expired." onVerify={jest.fn()} {...noops()} />,
    );
    expect(screen.getByTestId('otp-error')).toBeOnTheScreen();
  });

  it('offers a way back to the number', async () => {
    const onChangeNumber = jest.fn();
    await render(
      <OtpView phone="9000012345" onVerify={jest.fn()} {...noops()} onChangeNumber={onChangeNumber} />,
    );
    await userEvent.press(screen.getByTestId('otp-change-number'));
    expect(onChangeNumber).toHaveBeenCalled();
  });
});

describe('OtpView (ur)', () => {
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

  it('mirrors the copy and keeps the cells physical', async () => {
    await render(<OtpView phone="9000012345" initialCode="123" onVerify={jest.fn()} {...noops()} />);
    expect(screen.getByText('کوڈ درج کریں')).toBeOnTheScreen();
    expect(screen.getByTestId('otp-cells')).toHaveStyle({ flexDirection: 'row' });
    expect(screen.getByTestId('otp-change-number-row')).toHaveStyle({
      flexDirection: 'row-reverse',
    });
    // The chevron must not take the Nastaliq face — it has no glyph for it.
    expect(
      screen.getByTestId('otp-change-number-chevron', { includeHiddenElements: true }),
    ).toHaveStyle({ fontFamily: 'Archivo_400Regular' });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
