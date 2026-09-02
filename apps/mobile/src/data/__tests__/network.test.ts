import { renderHook } from '@testing-library/react-native';
import { useNetworkState } from 'expo-network';

import { useNetwork } from '../useNetwork';

jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));

const mocked = useNetworkState as jest.MockedFunction<typeof useNetworkState>;

describe('useNetwork', () => {
  it('is offline only when isConnected is explicitly false', async () => {
    mocked.mockReturnValue({ isConnected: false, isInternetReachable: false });
    const { result } = await renderHook(() => useNetwork());
    expect(result.current.offline).toBe(true);
  });

  it('is online when connected', async () => {
    mocked.mockReturnValue({ isConnected: true, isInternetReachable: true });
    const { result } = await renderHook(() => useNetwork());
    expect(result.current.offline).toBe(false);
  });

  it('does not flash offline before the first reading', async () => {
    mocked.mockReturnValue({});
    const { result } = await renderHook(() => useNetwork());
    expect(result.current.offline).toBe(false);
  });
});
