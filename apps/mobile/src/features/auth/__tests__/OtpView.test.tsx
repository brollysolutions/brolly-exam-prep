import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { OtpView } from '../OtpView';

const T0 = Date.parse('2026-09-02T10:00:00.000Z');

/** `Num` isolates its content in LRI…PDI, so matching rendered digits needs the same wrapper. */
const iso = (value: string) => `\u2066${value}\u2069`;

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

  it('counts down and turns resend into a button at zero', async () => {
    const onResend = jest.fn();
    await render(<OtpView phone="9000012345" onVerify={jest.fn()} {...noops()} onResend={onResend} />);
    expect(screen.getByText('s until resend')).toBeOnTheScreen();
    expect(screen.queryByTestId('otp-resend')).toBeNull();

    await advance(24_000);
    expect(screen.queryByText('s until resend')).toBeNull();
    await userEvent.press(screen.getByTestId('otp-resend'));
    expect(onResend).toHaveBeenCalled();
    // The countdown re-arms for the next attempt.
    expect(screen.getByText('s until resend')).toBeOnTheScreen();
  });

  it('verifies the code it collected', async () => {
    const onVerify = jest.fn(() => true);
    await render(<OtpView phone="9000012345" onVerify={onVerify} {...noops()} />);
    await type('123456');
    await userEvent.press(screen.getByTestId('otp-verify'));
    expect(onVerify).toHaveBeenCalledWith('123456');
    expect(screen.getByTestId('otp-cells')).toHaveAccessibilityValue({ text: '123456' });
  });

  it('clears the cells when the code is rejected', async () => {
    const onVerify = jest.fn(() => Promise.resolve(false));
    await render(<OtpView phone="9000012345" onVerify={onVerify} {...noops()} />);
    await type('111111');
    await userEvent.press(screen.getByTestId('otp-verify'));
    expect(onVerify).toHaveBeenCalledWith('111111');
    expect(within(screen.getByTestId('otp-cells')).queryByText(iso('1'))).toBeNull();
    expect(screen.getByTestId('otp-verify')).toBeDisabled();
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
    expect(screen.getByTestId('otp-back-row')).toHaveStyle({ flexDirection: 'row-reverse' });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
