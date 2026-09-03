import { act, render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import LibraryRoute from '@/app/(tabs)/tests';
import { useSessionStore } from '@/data/session';

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() };
/** The `?kind=` Home and the study topics link with; reassigned per test. */
let mockParams: { kind?: string } = {};
/**
 * The tab-focus callback the route registers. The mock runs it once on mount like the real
 * hook, and keeps it so a test can re-focus the tab the way pressing Home's card again does.
 */
let mockFocusTab: (() => void) | undefined;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => {
    mockFocusTab = effect;
    // `require` inside the factory: `jest.mock` is hoisted above the imports, so an imported
    // binding is out of scope here.
    (require('react') as typeof import('react')).useEffect(effect, [effect]);
  },
}));

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  mockParams = {};
  mockFocusTab = undefined;
  jest.clearAllMocks();
  useSessionStore.getState().logout();
});

describe('LibraryRoute', () => {
  it('lists the papers for a guest', async () => {
    await render(<LibraryRoute />);
    expect(screen.getByTestId('library-row-mock-07')).toBeOnTheScreen();
  });

  it('asks for a sign-in when a free paper is opened, and remembers which one', async () => {
    await render(<LibraryRoute />);
    await userEvent.press(screen.getByTestId('library-row-mock-07'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { returnTo: '/test/mock-07' },
    });
  });

  // A paywall is not a reason to make someone sign in: the toast is the whole answer.
  it('leaves a locked paper to its toast and asks for nothing', async () => {
    await render(<LibraryRoute />);
    await userEvent.press(screen.getByTestId('library-row-mock-08'));
    expect(screen.getByTestId('library-locked-toast')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  // F-20's Home card links to `/(tabs)/tests?kind=previous`; the shelf has to honour it.
  it('opens on the shelf the link asks for', async () => {
    mockParams = { kind: 'previous' };
    await render(<LibraryRoute />);
    expect(screen.getByTestId('library-row-prev-2022')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-row-mock-07')).toBeNull();
  });

  // F-21 sends a reader here with `?kind=sectional`; the shelf has to follow that link too.
  it('opens on the sectional shelf when the link asks for it', async () => {
    mockParams = { kind: 'sectional' };
    await render(<LibraryRoute />);
    expect(screen.getByTestId('library-row-sec-seating')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-row-mock-07')).toBeNull();
  });

  // The second press of Home's card sends the same `?kind=previous` as the first, so the
  // value alone cannot tell the two navigations apart — the tab's own focus can.
  it('honours the link again when the candidate has since chosen another shelf', async () => {
    mockParams = { kind: 'previous' };
    await render(<LibraryRoute />);
    await userEvent.press(screen.getByTestId('library-filter-full'));
    expect(screen.getByTestId('library-row-mock-07')).toBeOnTheScreen();
    await act(async () => {
      mockFocusTab?.();
    });
    expect(screen.getByTestId('library-row-prev-2022')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-row-mock-07')).toBeNull();
  });

  it('falls back to the full mocks when the link names a shelf that does not exist', async () => {
    mockParams = { kind: 'nonsense' };
    await render(<LibraryRoute />);
    expect(screen.getByTestId('library-row-mock-07')).toBeOnTheScreen();
  });

  // Reading a paper is not an attempt: there is nothing to score and nothing to keep, so
  // there is nothing for an account to hold.
  it('opens a previous paper for a guest with no sign-in', async () => {
    mockParams = { kind: 'previous' };
    await render(<LibraryRoute />);
    await userEvent.press(screen.getByTestId('library-view-prev-2022'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/paper/[id]',
      params: { id: 'prev-2022' },
    });
  });

  it('still asks for an account before practising one', async () => {
    mockParams = { kind: 'previous' };
    await render(<LibraryRoute />);
    await userEvent.press(screen.getByTestId('library-practise-prev-2022'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { returnTo: '/test/prev-2022' },
    });
  });

  it('opens the paper directly once the account is in place', async () => {
    useSessionStore.getState().setToken('tok-1');
    useSessionStore.getState().setPost('pc');
    useSessionStore.getState().setCategory('oc');
    useSessionStore.getState().completeOnboarding();
    await render(<LibraryRoute />);
    await userEvent.press(screen.getByTestId('library-row-mock-07'));
    expect(mockRouter.push).toHaveBeenCalledWith('/test/mock-07');
  });
});
