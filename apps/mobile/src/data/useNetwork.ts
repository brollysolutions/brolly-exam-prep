import { useNetworkState } from 'expo-network';

export type NetworkStatus = {
  /** True only when expo-network is sure there is no connection. */
  offline: boolean;
};

/**
 * The offline banner's single source of truth. `isConnected` is optional in expo-network and
 * is `undefined` until the first reading, so only an explicit `false` counts as offline —
 * a slow first probe must never flash the banner over a working connection.
 */
export function useNetwork(): NetworkStatus {
  const state = useNetworkState();
  return { offline: state.isConnected === false };
}
