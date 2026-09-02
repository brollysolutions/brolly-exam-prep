import { motion } from '@tslprb/design-tokens';
import {
  Easing,
  FadeIn,
  FadeInUp,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useReducedMotion,
} from 'react-native-reanimated';

/** cubic-bezier(.2,.8,.3,1) — the prototype's sheet curve. */
export const sheetEasing = Easing.bezier(0.2, 0.8, 0.3, 1);

/** Overlay fade: 140 ms by default. */
export const fadeIn = (ms: number = motion.fast) => FadeIn.duration(ms);
export const fadeOut = (ms: number = motion.fast) => FadeOut.duration(ms);
/** Sheet / dialog card rising from the bottom edge: 180 ms on the sheet curve. */
export const slideUp = (ms: number = motion.base) => SlideInDown.duration(ms).easing(sheetEasing);
export const slideOut = (ms: number = motion.base) => SlideOutDown.duration(ms).easing(sheetEasing);
/** Toast dropping in under the header: 180 ms, fades while moving down 8–25 px. */
export const slideDown = (ms: number = motion.base) => FadeInUp.duration(ms);

/** `useReducedMotion` that never throws when Reanimated is mocked or unavailable. */
export function useReducedMotionSafe(): boolean {
  try {
    return useReducedMotion();
  } catch {
    return false;
  }
}

type Preset<T> = (ms?: number) => T;
const gated =
  <T>(reduced: boolean, preset: Preset<T>) =>
  (ms?: number): T | undefined =>
    reduced ? undefined : preset(ms);

/**
 * Entering/exiting presets that resolve to `undefined` under reduced motion,
 * so `<Animated.View entering={m.fadeIn()} />` degrades to an instant change.
 */
export function useMotion() {
  const reduced = useReducedMotionSafe();
  return {
    reduced,
    fadeIn: gated(reduced, fadeIn),
    fadeOut: gated(reduced, fadeOut),
    slideUp: gated(reduced, slideUp),
    slideOut: gated(reduced, slideOut),
    slideDown: gated(reduced, slideDown),
  };
}
