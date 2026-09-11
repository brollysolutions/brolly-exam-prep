import { render, screen, userEvent } from '@testing-library/react-native';
import { paperForTest, SI_MOCK_01_ID, TESTS } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import ResultRoute from '@/app/test/[id]/result';
import SolutionsRoute from '@/app/test/[id]/solutions';
import PaperRoute from '@/app/paper/[id]';
import { useAttemptStore } from '@/data/attempt';
import { useCompletedTestsStore } from '@/data/completedTests';
import { completeImportedAttempt } from '@/data/importedAttempt';

const mockRedirect = jest.fn();
const mockPush = jest.fn();
let mockRouteId = 'simocktest';
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockRouteId }),
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
}));
jest.mock('expo-network', () => ({ useNetworkState: () => ({ isConnected: true }) }));

const meta = TESTS.find((t) => t.id === SI_MOCK_01_ID)!;
const paper = paperForTest(meta);
const submit = () => {
  useAttemptStore.getState().start(meta);
  useAttemptStore.getState().answer(1, paper[0].correct);
  useAttemptStore.getState().submit();
  completeImportedAttempt(paper);
};

beforeAll(() => initI18n('en'));
beforeEach(() => {
  mockRedirect.mockClear();
  mockPush.mockClear();
  mockRouteId = 'simocktest';
  useAttemptStore.getState().reset();
  useCompletedTestsStore.getState().reset();
});

it.each([ResultRoute, SolutionsRoute])(
  'gates direct review links before submission',
  async (Route) => {
    await render(<Route />);
    expect(mockRedirect).toHaveBeenCalledWith('/tests/simocktest');
    expect(screen.queryByTestId('result-screen')).toBeNull();
    expect(screen.queryByTestId('solutions-screen')).toBeNull();
  },
);

it('does not expose the imported answer key through the previous-paper viewer', async () => {
  await render(<PaperRoute />);
  expect(screen.queryByText(paper[0].explanation.en)).toBeNull();
  expect(screen.queryByText(paper[0].text.en)).toBeNull();
});

it('shows the saved score, correct title and review-all action without sample analytics', async () => {
  submit();
  await render(<ResultRoute />);
  expect(await screen.findByTestId('result-score')).toHaveTextContent(/1/);
  expect(screen.getByTestId('result-header')).toHaveTextContent(/SI Mock Test 01/);
  expect(screen.getByTestId('result-cta')).toHaveTextContent('Answers & explanation');
  expect(screen.queryByTestId('result-cost-row')).toBeNull();
  expect(screen.queryByTestId('result-qualified')).toBeNull();
  await userEvent.press(screen.getByTestId('result-cta'));
  expect(mockPush).toHaveBeenCalledWith('/test/simocktest/solutions');
});

it.each([
  { Route: ResultRoute, path: '/test/simocktest/result' },
  { Route: SolutionsRoute, path: '/test/simocktest/solutions' },
])('redirects the old review link to $path', async ({ Route, path }) => {
  mockRouteId = SI_MOCK_01_ID;
  submit();
  await render(<Route />);
  expect(mockRedirect).toHaveBeenCalledWith(path);
  expect(screen.queryByTestId('result-screen')).toBeNull();
  expect(screen.queryByTestId('solutions-screen')).toBeNull();
  expect(useCompletedTestsStore.getState().tests[meta.id].result.score).toBe(1);
});

it('opens all 200 solutions after submission, with no invented crowd timing', async () => {
  submit();
  await render(<SolutionsRoute />);
  const all = await screen.findByTestId('solutions-filter-all');
  expect(all.props.accessibilityState).toMatchObject({ checked: true });
  expect(all).toHaveTextContent(/\(200\)/);
  expect(screen.getByTestId('solutions-list').props.data).toHaveLength(200);
  expect(screen.getAllByTestId('solution-correct-answer').length).toBeGreaterThan(0);
  expect(screen.getByText(paper[0].explanation.en)).toBeOnTheScreen();
  expect(screen.queryByTestId('solution-avg-time')).toBeNull();
});

it('locks the old solutions again during a retake', async () => {
  submit();
  useAttemptStore.getState().start(meta);
  await render(<SolutionsRoute />);
  expect(mockRedirect).toHaveBeenCalled();
  expect(screen.queryByTestId('solutions-screen')).toBeNull();
});
