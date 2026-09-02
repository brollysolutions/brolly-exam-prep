import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { Dialog } from '../Dialog';

const base = {
  kicker: 'Final step',
  title: 'Submit the test?',
  body: 'You cannot change answers after submitting.',
};
/** `Num` wraps digits in LRI…PDI isolation. */
const num = (n: number) => `⁦${n}⁩`;

describe('Dialog', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('renders nothing while hidden', async () => {
    await render(
      <Dialog
        visible={false}
        {...base}
        primary={{ label: 'Yes', onPress: () => {} }}
        testID="dlg"
      />,
    );
    expect(screen.queryByTestId('dlg')).toBeNull();
  });

  it('renders kicker, title, body and every stat tile', async () => {
    await render(
      <Dialog
        visible
        {...base}
        stats={[
          { num: 31, label: 'Answered' },
          { num: 6, label: 'Not answered' },
          { num: 3, label: 'Marked' },
        ]}
        primary={{ label: 'Yes, submit', onPress: () => {} }}
      />,
    );
    expect(screen.getByText(base.kicker)).toBeOnTheScreen();
    expect(screen.getByText(base.title)).toBeOnTheScreen();
    expect(screen.getByText(base.body)).toBeOnTheScreen();
    for (const label of ['Answered', 'Not answered', 'Marked'])
      expect(screen.getByText(label)).toBeOnTheScreen();
    for (const n of [31, 6, 3]) expect(screen.getByText(num(n))).toBeOnTheScreen();
  });

  it('routes primary and secondary presses to their callbacks', async () => {
    const onPrimary = jest.fn();
    const onSecondary = jest.fn();
    await render(
      <Dialog
        visible
        {...base}
        primary={{ label: 'Yes, submit', onPress: onPrimary }}
        secondary={{ label: 'Go back', onPress: onSecondary }}
      />,
    );
    await userEvent.press(screen.getByText('Yes, submit'));
    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).not.toHaveBeenCalled();
    await userEvent.press(screen.getByText('Go back'));
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it('omits the secondary button when not provided', async () => {
    await render(<Dialog visible {...base} primary={{ label: 'Continue', onPress: () => {} }} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
