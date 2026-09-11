import { render, screen, userEvent } from '@testing-library/react-native';
import { FREE_MOCK_SHORT } from '@tslprb/fixtures';
import { i18n, initI18n } from '@tslprb/i18n';

import type { PaletteCounts } from '@/data/attempt.selectors';

import {
  AttemptDialogs,
  AttemptNotices,
  CallOverlay,
  lockedMessage,
  type AttemptDialogKind,
} from '../AttemptOverlays';

const COUNTS: PaletteCounts = { answered: 8, notAnswered: 4, marked: 3, notVisited: 28 };

const handlers = () => ({
  onDismiss: jest.fn(),
  onLeave: jest.fn(),
  onSubmit: jest.fn(),
  onSeeResult: jest.fn(),
});

async function renderDialogs(kind: AttemptDialogKind | null) {
  const h = handlers();
  await render(<AttemptDialogs kind={kind} counts={COUNTS} {...h} />);
  return h;
}

describe('AttemptNotices', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('renders nothing when online and quiet', async () => {
    await render(<AttemptNotices />);
    expect(screen.queryByTestId('attempt-offline')).toBeNull();
    expect(screen.queryByTestId('attempt-toast')).toBeNull();
  });

  it('shows the offline banner and hides it when back online', async () => {
    await render(<AttemptNotices offline />);
    expect(screen.getByTestId('attempt-offline')).toBeOnTheScreen();
    await screen.rerender(<AttemptNotices offline={false} />);
    expect(screen.queryByTestId('attempt-offline')).toBeNull();
  });

  it('shows a toast with its tone', async () => {
    await render(
      <AttemptNotices toast={{ key: 'warn1', text: '1 minute left', tone: 'danger' }} />,
    );
    expect(screen.getByTestId('attempt-toast')).toHaveTextContent('1 minute left');
  });
});

describe('lockedMessage', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('names the locked section and the one that unlocks it', () => {
    const text = lockedMessage(i18n.t.bind(i18n), FREE_MOCK_SHORT, 3);
    expect(text).toContain('Telangana');
    expect(text).toContain('General Studies');
  });

  it('degrades to empty interpolations without a pattern', () => {
    expect(lockedMessage(i18n.t.bind(i18n), undefined, 3)).toContain('unlocks after');
  });
});

describe('AttemptDialogs', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('renders none of the four when kind is null', async () => {
    await renderDialogs(null);
    for (const kind of ['exit', 'submit', 'resume', 'auto'])
      expect(screen.queryByTestId(`dialog-${kind}`)).toBeNull();
  });

  it('exit: warns, stays on primary and leaves on secondary', async () => {
    const h = await renderDialogs('exit');
    expect(screen.getByTestId('dialog-exit')).toBeOnTheScreen();
    expect(screen.getByText('Warning')).toBeOnTheScreen();
    expect(screen.getByText('Leave the test?')).toBeOnTheScreen();

    await userEvent.press(screen.getByText('Stay in the test'));
    expect(h.onDismiss).toHaveBeenCalledTimes(1);
    await userEvent.press(screen.getByText('Leave'));
    expect(h.onLeave).toHaveBeenCalledTimes(1);
  });

  it('submit: shows the three tiles and submits on primary', async () => {
    const h = await renderDialogs('submit');
    expect(screen.getByText('Final step')).toBeOnTheScreen();
    expect(screen.getByText('Submit the test?')).toBeOnTheScreen();
    for (const n of [8, 4, 3]) expect(screen.getByText(`⁦${n}⁩`)).toBeOnTheScreen();

    await userEvent.press(screen.getByText('Yes, submit'));
    expect(h.onSubmit).toHaveBeenCalledTimes(1);
    await userEvent.press(screen.getByText('Go back'));
    expect(h.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('resume: one button, which dismisses', async () => {
    const h = await renderDialogs('resume');
    expect(screen.getByText('Welcome back')).toBeOnTheScreen();
    expect(screen.getByText('Nothing was lost')).toBeOnTheScreen();
    await userEvent.press(screen.getByText('Continue'));
    expect(h.onDismiss).toHaveBeenCalledTimes(1);
    expect(h.onLeave).not.toHaveBeenCalled();
  });

  it('auto: explains that a connection is required and retries the result on primary', async () => {
    const h = await renderDialogs('auto');
    expect(screen.getByText('Time up')).toBeOnTheScreen();
    expect(screen.getByText('Time is up')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Your answers remain saved on this phone. Connect to the internet to submit and receive the result.',
      ),
    ).toBeOnTheScreen();
    await userEvent.press(screen.getByText('Try for result'));
    expect(h.onSeeResult).toHaveBeenCalledTimes(1);
  });

  it('pending: confirms the durable save and offers a safe exit or retry', async () => {
    const h = await renderDialogs('pending');
    expect(screen.getByText('Submission pending')).toBeOnTheScreen();
    expect(
      screen.getByText('Test saved. It will be submitted when internet is available.'),
    ).toBeOnTheScreen();
    await userEvent.press(screen.getByText('Try again'));
    expect(h.onSeeResult).toHaveBeenCalledTimes(1);
    await userEvent.press(screen.getByText('Back to tests'));
    expect(h.onLeave).toHaveBeenCalledTimes(1);
  });

  it('submitting: shows a non-interactive progress state', async () => {
    await renderDialogs('submitting');
    expect(screen.getByText('Submitting your test...')).toBeOnTheScreen();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('permanent submission error preserves the test and offers a safe exit', async () => {
    const h = await renderDialogs('submitError');
    expect(screen.getByText('Your test is still saved')).toBeOnTheScreen();
    await userEvent.press(screen.getByText('Back to tests'));
    expect(h.onLeave).toHaveBeenCalledTimes(1);
  });
});

describe('CallOverlay', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('renders nothing while hidden', async () => {
    await render(<CallOverlay visible={false} onEnd={() => {}} />);
    expect(screen.queryByTestId('call-overlay')).toBeNull();
  });

  it('shows the caller, the note and two 64 px actions', async () => {
    const onEnd = jest.fn();
    await render(<CallOverlay visible onEnd={onEnd} />);
    expect(screen.getByText('INCOMING CALL')).toBeOnTheScreen();
    expect(screen.getByText('⁦+91 90000 12345⁩')).toBeOnTheScreen();
    expect(screen.getByText('Simulated OS-level interruption')).toBeOnTheScreen();

    await userEvent.press(screen.getByTestId('call-decline'));
    expect(onEnd).toHaveBeenCalledTimes(1);
    await userEvent.press(screen.getByTestId('call-accept'));
    expect(onEnd).toHaveBeenCalledTimes(2);
  });
});
