import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS !== 'web';

/** Haptics are feedback, never the only feedback: every call is fire-and-forget and swallows errors. */
const fire = (run: () => Promise<void>) => {
  if (!enabled) return;
  run().catch(() => undefined);
};

/** Light tap: keypad keys, chips. */
export const tapLight = () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
/** Selection tick: options, palette cells, language switch, primary buttons. */
export const select = () => fire(() => Haptics.selectionAsync());
/** Submit / verified. */
export const success = () =>
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
/** 5-minute and 1-minute toasts. */
export const warning = () =>
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
