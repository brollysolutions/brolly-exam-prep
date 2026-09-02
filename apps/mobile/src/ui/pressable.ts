import { useCallback, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';

/** `PressableProps` types its listeners as nullable, so the hook accepts `null` too. */
export type PressListener = ((event: GestureResponderEvent) => void) | null | undefined;

export type PressHandlers = {
  onPressIn: (event: GestureResponderEvent) => void;
  onPressOut: (event: GestureResponderEvent) => void;
};

/**
 * Press feedback as state instead of a `style` callback.
 *
 * A `style` FUNCTION on a component that also carries `className` silently loses its static
 * entries on web: react-native-css-interop resolves the class list into the `style` prop and
 * cannot look inside a callback, so any size or colour declared there never reaches the DOM
 * (review round 1: Clear rendered 67 pt instead of 92, and every palette cell lost its fill).
 *
 * Keeping every static value in one flattened object style and driving the pressed delta from
 * `onPressIn` / `onPressOut` fixes the web export and makes those values assertable with
 * `toHaveStyle` in tests. Callers' own press handlers still run.
 */
export function usePressed(
  onPressIn?: PressListener,
  onPressOut?: PressListener,
): { pressed: boolean; handlers: PressHandlers } {
  const [pressed, setPressed] = useState(false);
  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      setPressed(true);
      onPressIn?.(event);
    },
    [onPressIn],
  );
  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      setPressed(false);
      onPressOut?.(event);
    },
    [onPressOut],
  );
  return { pressed, handlers: { onPressIn: handlePressIn, onPressOut: handlePressOut } };
}
