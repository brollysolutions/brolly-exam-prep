import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { initI18n } from '@tslprb/i18n';
import { CatalogGate } from '../CatalogGate';
import { MockApi } from '@/data/api/mock';

let mockOffline = false;
const mockApi = new MockApi();
jest.mock('@/data/api', () => ({ getApi: () => mockApi }));
jest.mock('@/data/useNetwork', () => ({ useNetwork: () => ({ offline: mockOffline }) }));
jest.mock('@/data/complete', () => ({ retryPendingSubmissions: jest.fn(async () => undefined) }));

beforeAll(() => initI18n('en'));
beforeEach(() => {
  mockOffline = false;
});
afterEach(() => jest.restoreAllMocks());

it('keeps the current screen mounted when connectivity changes after boot', async () => {
  await render(
    <CatalogGate>
      <Text>Running exam</Text>
    </CatalogGate>,
  );
  expect(await screen.findByText('Running exam')).toBeOnTheScreen();
  const load = jest
    .spyOn(mockApi, 'listTestMetas')
    .mockRejectedValue(new Error('server unavailable'));
  mockOffline = true;
  await screen.rerender(
    <CatalogGate>
      <Text>Running exam</Text>
    </CatalogGate>,
  );
  expect(screen.getByText('Running exam')).toBeOnTheScreen();
  expect(load).not.toHaveBeenCalled();
  mockOffline = false;
  await screen.rerender(
    <CatalogGate>
      <Text>Running exam</Text>
    </CatalogGate>,
  );
  expect(screen.getByText('Running exam')).toBeOnTheScreen();
  expect(load).not.toHaveBeenCalled();
});
