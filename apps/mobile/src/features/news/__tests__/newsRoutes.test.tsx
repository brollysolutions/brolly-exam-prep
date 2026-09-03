import { render, screen, userEvent } from '@testing-library/react-native';
import { AFFAIRS, NOTICES } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';
import { Linking } from 'react-native';

import AffairsRoute from '@/app/affairs';
import UpdatesRoute from '@/app/updates';
import { useSessionStore } from '@/data/session';

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.getState().logout();
});

describe('UpdatesRoute', () => {
  // Whether the hall tickets are out is public information. A sign-in wall in front of it
  // would cost more than it could ever buy, so there is no gate on this route at all.
  it('shows the whole notice board to a guest', async () => {
    await render(<UpdatesRoute />);
    for (const notice of NOTICES) {
      expect(screen.getByTestId(`update-card-${notice.id}`)).toBeOnTheScreen();
    }
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('opens the full notice in the phone’s browser', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<UpdatesRoute />);
    await userEvent.press(screen.getByTestId('update-row-nt-2026-notification'));
    await userEvent.press(screen.getByTestId('update-link-nt-2026-notification'));
    expect(openURL).toHaveBeenCalledWith('https://www.tslprb.in');
    openURL.mockRestore();
  });

  // A phone with nothing registered for https rejects the promise. The reader stays on a
  // screen that already carries the notice in full, so the rejection is swallowed — but it
  // must not surface as an unhandled rejection that fails the next test in the run.
  it('survives a device that cannot open a link', async () => {
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValue(new Error('no handler for https'));
    await render(<UpdatesRoute />);
    await userEvent.press(screen.getByTestId('update-row-nt-2026-notification'));
    await expect(
      userEvent.press(screen.getByTestId('update-link-nt-2026-notification')),
    ).resolves.toBeUndefined();
    expect(openURL).toHaveBeenCalled();
    openURL.mockRestore();
  });

  it('goes back the way it came', async () => {
    await render(<UpdatesRoute />);
    await userEvent.press(screen.getByTestId('updates-header-back'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

describe('AffairsRoute', () => {
  it('shows the whole digest to a guest, grouped by day', async () => {
    await render(<AffairsRoute />);
    for (const affair of AFFAIRS) {
      expect(screen.getByTestId(`affair-card-${affair.id}`)).toBeOnTheScreen();
    }
    expect(screen.getByTestId('affairs-day-2026-09-02')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('goes back the way it came', async () => {
    await render(<AffairsRoute />);
    await userEvent.press(screen.getByTestId('affairs-header-back'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});
