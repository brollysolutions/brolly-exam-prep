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

  // A card that ASKS wears the gold pill; a card that carries a `danger` tone wears the
  // quiet pill with a red dot AND red words — an auto-submit and a delete-account
  // confirmation are the two most consequential cards in the app, and an `ink3` label put
  // them at caption weight (fix wave 1, C2). `dangerInk` on `surface2` is 5.35:1.
  // Gold is never the word: the gold pill's label is ink, never `accentInk` on a tint (4.14).
  it.each([
    ['accent', 'bg-accentTint', 'text-ink'],
    ['hivis', 'bg-accentTint', 'text-ink'],
    ['hazard', 'bg-accentTint', 'text-ink'],
    ['danger', 'bg-surface2', 'text-dangerInk'],
    ['flag', 'bg-surface2', 'text-dangerInk'],
  ] as const)('tone %s fills its pill %s under a gold top edge', async (tone, fill, label) => {
    await render(
      <Dialog
        visible
        tone={tone}
        {...base}
        primary={{ label: 'Yes', onPress: () => {} }}
        testID="dlg"
      />,
    );
    const pill = screen.getByTestId('dlg-pill');
    expect(pill.props.className).toMatch(new RegExp(`\\b${fill}\\b`));
    expect(screen.getByText(base.kicker).props.className).toMatch(new RegExp(`\\b${label}\\b`));
    expect(screen.getByText(base.kicker).props.className).not.toMatch(/\btext-accentInk\b/);
    const card = screen.getByTestId('dlg-card');
    expect(card.props.className).toMatch(/\bborder-t-accentStrong\b/);
    expect(card.props.className).toMatch(/\bborder-t-3\b/);
    expect(card.props.className).toMatch(/\bbg-surface\b/);
    expect(card.props.className).toMatch(/\brounded-lg\b/);
  });

  // Only the danger card carries a status dot: a submit or a resume is not a state gone wrong.
  it('marks only the danger tone with a red dot', async () => {
    await render(
      <Dialog
        visible
        tone="flag"
        {...base}
        primary={{ label: 'Wait', onPress: () => {} }}
        testID="dlg"
      />,
    );
    expect(screen.getByTestId('dlg-pill-dot').props.className).toMatch(/\bbg-dangerInk\b/);

    await render(
      <Dialog
        visible
        tone="accent"
        {...base}
        primary={{ label: 'Yes', onPress: () => {} }}
        testID="ask"
      />,
    );
    expect(screen.queryByTestId('ask-pill-dot')).toBeNull();
  });

  // The title is the screen's one sentence while the card is open, so it takes the display face.
  it('sets the title in the display face', async () => {
    await render(
      <Dialog visible {...base} primary={{ label: 'Yes', onPress: () => {} }} testID="dlg" />,
    );
    expect(screen.getByText(base.title)).toHaveStyle({ fontFamily: 'PlayfairDisplay_400Regular' });
  });

  it('omits the secondary button when not provided', async () => {
    await render(<Dialog visible {...base} primary={{ label: 'Continue', onPress: () => {} }} />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
