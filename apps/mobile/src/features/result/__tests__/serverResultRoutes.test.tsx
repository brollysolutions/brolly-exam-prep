import { render, screen } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import ResultRoute from '@/app/test/[id]/result';
import SolutionsRoute from '@/app/test/[id]/solutions';
import { ApiError, getApi, resetApi } from '@/data/api';
import { useSessionStore } from '@/data/session';
import { MockApi } from '@/data/testing/mockApi';

let mockRouteId = '';
let mockConnected = true;
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockRouteId }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  Redirect: () => null,
}));
jest.mock('expo-network', () => ({
  useNetworkState: () => ({ isConnected: mockConnected }),
}));

beforeAll(() => initI18n('en'));
beforeEach(() => {
  resetApi();
  mockConnected = true;
  useSessionStore.setState({ userId: 'result-route-user', phone: '7993399336' });
});
afterEach(() => jest.restoreAllMocks());

async function submittedResultId(): Promise<string> {
  const api = getApi();
  const attempt = await api.createAttempt({ test_id: 'mock-07' });
  return (await api.submitAttempt(attempt.id)).result_id;
}

describe('server result routes', () => {
  it('loads result detail using the result id in the route', async () => {
    mockRouteId = await submittedResultId();
    const detail = jest.spyOn(MockApi.prototype, 'getResultDetail');

    await render(<ResultRoute />);

    expect(await screen.findByTestId('result-score')).toBeOnTheScreen();
    expect(detail).toHaveBeenCalledWith(mockRouteId);
  });

  it('loads authorized result paper and never reopens the public test paper', async () => {
    mockRouteId = await submittedResultId();
    const review = jest.spyOn(MockApi.prototype, 'getReviewPaper');
    const publicPaper = jest.spyOn(MockApi.prototype, 'getPaper');

    await render(<SolutionsRoute />);

    expect(await screen.findByTestId('solutions-list')).toBeOnTheScreen();
    expect(review).toHaveBeenCalledWith(mockRouteId);
    expect(publicPaper).not.toHaveBeenCalled();
  });

  it('renders the result retry state for an unauthorized result', async () => {
    mockRouteId = 'result-forbidden';
    jest
      .spyOn(MockApi.prototype, 'getResultDetail')
      .mockRejectedValueOnce(new ApiError(401, 'http_error'));

    await render(<ResultRoute />);

    expect(await screen.findByTestId('result-error')).toBeOnTheScreen();
  });

  it('renders the solutions retry state for an unauthorized review paper', async () => {
    mockRouteId = 'result-forbidden';
    jest
      .spyOn(MockApi.prototype, 'getReviewPaper')
      .mockRejectedValueOnce(new ApiError(401, 'http_error'));

    await render(<SolutionsRoute />);

    expect(await screen.findByTestId('solutions-error')).toBeOnTheScreen();
  });

  it('explains when an offline result has not been downloaded', async () => {
    mockConnected = false;
    mockRouteId = 'result-not-cached';
    jest.spyOn(MockApi.prototype, 'getResultDetail').mockRejectedValueOnce(new Error('offline'));

    await render(<ResultRoute />);

    expect(
      await screen.findByText(/result has not been downloaded yet/i),
    ).toBeOnTheScreen();
  });

  it('explains when an offline review has not been downloaded', async () => {
    mockConnected = false;
    mockRouteId = 'review-not-cached';
    jest.spyOn(MockApi.prototype, 'getReviewPaper').mockRejectedValueOnce(new Error('offline'));

    await render(<SolutionsRoute />);

    expect(
      await screen.findByText(/review has not been downloaded yet/i),
    ).toBeOnTheScreen();
  });
});
