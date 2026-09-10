import { act, render, screen } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import PaperRoute from '@/app/paper/[id]';
import { resetApi } from '@/data/api';

const mockBack = jest.fn();
let mockParams: { id: string } = { id: 'prev-2022' };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
}));

/** Let the route's two API awaits settle. */
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.clearAllMocks();
  resetApi();
});

describe('PaperRoute', () => {
  it('opens a previous paper for a guest, with no gate in front of it', async () => {
    mockParams = { id: 'prev-2022' };
    await render(<PaperRoute />);
    await flush();
    // Nothing to sit, so nothing to sign in for: the paper itself is the whole screen.
    expect(screen.getByText('PWT 2022 — SCT PC (demo)')).toBeOnTheScreen();
    expect(screen.getByTestId('paper-list')).toBeOnTheScreen();
    expect(screen.getByTestId('paper-card-1')).toBeOnTheScreen();
  });

  it('answers an id that is not a paper with the not-found state', async () => {
    mockParams = { id: 'no-such-paper' };
    await render(<PaperRoute />);
    await flush();
    expect(screen.getByTestId('paper-not-found')).toBeOnTheScreen();
    expect(screen.getByText('That paper could not be opened.')).toBeOnTheScreen();
    expect(screen.queryByTestId('paper-list')).toBeNull();
  });
});

jest.mock('@/data/api', () => {
  const actual = jest.requireActual('@/data/api');
  const { MockApi } = jest.requireActual('@/data/api/mock');
  let api = new MockApi();
  return {
    ...actual,
    getApi: () => api,
    resetApi: () => {
      api = new MockApi();
    },
  };
});
