---
paths:
  - "apps/mobile/**"
  - "packages/design-tokens/**"
---
# Mobile UI rules (auto-loaded for apps/mobile)

- Colours, spacing, radii and type come ONLY from `@tslprb/design-tokens` (via Tailwind classes or the `tokens` object). A raw hex in a component is a defect.
- Primitives live in `apps/mobile/src/ui/`. Reuse `Screen`, `Text`, `Button`, `Card`, `Chip`, `Sheet`, `Dialog`, `Toast`, `Banner`, `Keypad`, `OtpCells`, `ProgressRail`, `PaletteCell`, `Row`, `Stack` before writing new ones.
- Every pressable: `Pressable` from RN (or `Button`), min 48×48, `accessibilityRole`, `accessibilityLabel` when icon-only, haptic on primary actions (`expo-haptics` selection/impact).
- Motion via `react-native-reanimated` only; durations 140–220 ms; honour `useReducedMotion()`.
- Bottom sheets: `@gorhom/bottom-sheet` with the hazard-yellow top border. Dialogs are bottom-anchored cards (see prototype), not centred alerts.
- Timer logic uses a persisted `endsAt` timestamp, never a decrementing counter; recompute on `AppState` active.
- Images via `expo-image`. Lists > 20 items via `FlatList`/`FlashList` with stable keys.
- Platform idioms: `Platform.select` for iOS (HIG: large titles, SF Symbols via `expo-symbols`) vs Android (Material: ripple, edge-to-edge, predictive back). Keep the hi-vis identity on both.
- Each screen exports a default route component and a pure `*View` component that takes props, so tests and the dev states screen can render any state.
- Add every new state to `src/app/dev/states.tsx`.
- Web gotcha (react-native-css-interop + React Compiler): never combine an array `style` with a `className` that changes between renders — classes accumulate and the stale one wins. Pass a flattened style object (`StyleSheet.flatten`) or put the dynamic part in `className` only. Reanimated `Animated.View` ignores `className` entirely: give it inline styles and wrap a styled `View` inside.
- Web gotcha 2: a `style` FUNCTION on a `Pressable` that also has `className` loses its static values under css-interop. Use `usePressed()`; no style callbacks at all. Keep static sizes/colours in `className` or a flattened object `style`, and drive the `pressed` delta from the hook's `onPressIn`/`onPressOut` handlers.
- `FlatList` slots (`ListEmptyComponent`, `ListHeaderComponent`, …) take a COMPONENT, not an element: passing `<Empty />` drags the owner fiber into serialised props and RNTL snapshots blow up with `RangeError: Invalid string length`.
- Text colour `mute` is decorative only (3.97:1). Notes, captions, timing lines and kickers use `dim`.
