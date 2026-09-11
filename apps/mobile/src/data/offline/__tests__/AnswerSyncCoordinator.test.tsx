import { act, render, screen } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useSessionStore } from '../../session';
import { useNetwork } from '../../useNetwork';
import { requestAnswerSyncForCurrentUser } from '../answerSync';
import { AnswerSyncCoordinator } from '../AnswerSyncCoordinator';
import { requestSubmissionSyncForCurrentUser } from '../submissionSync';

jest.mock('../../useNetwork', () => ({ useNetwork: jest.fn() }));
const submitted = jest.fn();

const mockedNetwork = useNetwork as jest.MockedFunction<typeof useNetwork>;
const mockedRequest = requestAnswerSyncForCurrentUser as jest.MockedFunction<
  typeof requestAnswerSyncForCurrentUser
>;
const mockedSubmissionRequest = requestSubmissionSyncForCurrentUser as jest.MockedFunction<
  typeof requestSubmissionSyncForCurrentUser
>;
let appStateListener: ((state: AppStateStatus) => void) | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  mockedNetwork.mockReturnValue({ offline: true });
  useSessionStore.setState({
    userId: 'backend-user-1',
    phone: '7993399336',
    token: 'token-1',
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appStateListener = listener as (state: AppStateStatus) => void;
    return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  appStateListener = undefined;
});

it('triggers answer sync after authentication, reconnection, and foregrounding', async () => {
  await render(<AnswerSyncCoordinator onSubmitted={submitted} />);
  expect(mockedRequest).toHaveBeenCalledWith(true);
  expect(mockedSubmissionRequest).toHaveBeenCalledWith(true);

  mockedNetwork.mockReturnValue({ offline: false });
  await screen.rerender(<AnswerSyncCoordinator onSubmitted={submitted} />);
  expect(mockedRequest).toHaveBeenCalledWith(false);
  expect(mockedSubmissionRequest).toHaveBeenCalledWith(false);

  await act(() => appStateListener?.('active'));
  expect(mockedRequest).toHaveBeenCalledTimes(3);
  expect(mockedSubmissionRequest).toHaveBeenCalledTimes(3);
});

it('does not trigger network or authentication sync without a signed-in owner', async () => {
  useSessionStore.setState({ userId: undefined, phone: undefined, token: undefined });
  mockedNetwork.mockReturnValue({ offline: false });

  await render(<AnswerSyncCoordinator onSubmitted={submitted} />);

  expect(mockedRequest).not.toHaveBeenCalled();
  expect(mockedSubmissionRequest).not.toHaveBeenCalled();
});

it('opens the existing result route when a recovered submission completes', async () => {
  mockedSubmissionRequest.mockResolvedValue({
    completed: [
      {
        localAttemptId: 'local-1',
        serverAttemptId: 'server-1',
        testId: 'test-pwt-07',
        resultId: 'result-1',
      },
    ],
    pending: 0,
    failed: 0,
    permanentFailures: 0,
    skipped: 0,
    pausedForAuth: false,
    offline: false,
  });

  await render(<AnswerSyncCoordinator onSubmitted={submitted} />);

  expect(submitted).toHaveBeenCalledWith('result-1');
});
