import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/** One tag for both locks, so a second screen can never release ours. */
const TAG = 'tslprb-attempt';

/**
 * Keeps the screen awake and blocks screenshots / recordings for as long as an attempt is
 * running — a candidate reading a long comprehension must not have the paper dim out, and a
 * live paper must not be shareable.
 *
 * The imperative API is used rather than `useKeepAwake` / `usePreventScreenCapture` because
 * both of those bind to the component's whole lifetime: this has to follow `running`, and it
 * has to be a no-op on web, where `preventScreenCaptureAsync` rejects with an
 * `UnavailabilityError`.
 */
export function useAttemptGuards(running: boolean): void {
  useEffect(() => {
    if (!running || Platform.OS === 'web') return;
    void activateKeepAwakeAsync(TAG).catch(() => undefined);
    void preventScreenCaptureAsync(TAG).catch(() => undefined);
    return () => {
      void deactivateKeepAwake(TAG).catch(() => undefined);
      void allowScreenCaptureAsync(TAG).catch(() => undefined);
    };
  }, [running]);
}
