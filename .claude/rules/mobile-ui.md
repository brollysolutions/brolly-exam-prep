---
paths:
  - "apps/mobile/**"
  - "packages/design-tokens/**"
---
# Mobile UI rules (auto-loaded for apps/mobile)

- Colours, spacing, radii and type come ONLY from `@tslprb/design-tokens` (via Tailwind classes or the `tokens` object). A raw hex in a component is a defect.
- Primitives live in `apps/mobile/src/ui/`. Reuse `Screen`, `Brand`, `Text`, `Button`, `Card`, `Chip`, `SegmentedChips`, `Kicker`, `Sheet`, `Dialog`, `Toast`, `Banner`, `Keypad`, `OtpCells`, `PhoneField`, `ProgressRail`, `Rail`, `PaletteCell`, `Toggle`, `Row`, `Stack` before writing new ones.
- Every pressable: `Pressable` from RN (or `Button`), min 48×48, `accessibilityRole`, `accessibilityLabel` when icon-only, haptic on primary actions (`expo-haptics` selection/impact).
- Motion via `react-native-reanimated` only; durations 140–220 ms; honour `useReducedMotion()`.
- Bottom sheets: `@gorhom/bottom-sheet` on `surface` with the 3 px gold (`accentStrong`) top edge. Dialogs are bottom-anchored `surface` cards, not centred alerts.
- Timer logic uses a persisted `endsAt` timestamp, never a decrementing counter; recompute on `AppState` active.
- Images via `expo-image`. Lists > 20 items via `FlatList`/`FlashList` with stable keys.
- Platform idioms: `Platform.select` for iOS (HIG: large titles, SF Symbols via `expo-symbols`) vs Android (Material: ripple, edge-to-edge, predictive back). Keep the Brolly-on-cream identity on both.
- Each screen exports a default route component and a pure `*View` component that takes props, so tests and the dev states screen can render any state.
- Add every new state to `src/app/dev/states.tsx`.
- Web gotcha (react-native-css-interop + React Compiler): never combine an array `style` with a `className` that changes between renders — classes accumulate and the stale one wins. Pass a flattened style object (`StyleSheet.flatten`) or put the dynamic part in `className` only. Reanimated `Animated.View` ignores `className` entirely: give it inline styles and wrap a styled `View` inside.
- Web gotcha 2: a `style` FUNCTION on a `Pressable` that also has `className` loses its static values under css-interop. Use `usePressed()`; no style callbacks at all. Keep static sizes/colours in `className` or a flattened object `style`, and drive the `pressed` delta from the hook's `onPressIn`/`onPressOut` handlers.
- `FlatList` slots (`ListEmptyComponent`, `ListHeaderComponent`, …) take a COMPONENT, not an element: passing `<Empty />` drags the owner fiber into serialised props and RNTL snapshots blow up with `RangeError: Invalid string length`.
- Colour names in `src/ui` are semantic only (`canvas`, `surface`, `ink`, `accent`, …; `packages/design-tokens/test/legacy.test.mjs` enforces it). Screens may still use the legacy aliases (`tar`, `dim`, `hivis`, …) until Phase E renames them.
- Gold is never text except `accentInk` (`#856a22`, 4.6:1 on cream); `accent` and `accentSoft` are fills, `accentStrong` is for rails, rings and edges. `ink3` (5.0:1) is the floor for text and never below `caption`; `ink4` is decorative only.
- Exactly one ink-filled `Button variant="primary"` and exactly one gold-edged card per screen. No rail as screen chrome; `Rail` is the attempt screen's critical-time warning only.
- Pressed feedback on cream is a `surface2` fill (`pressedClass` from `pressable.ts`), not opacity — opacity is invisible between two creams. Filled controls (ink, gold) dim with `pressedStyle`. Never emit two `bg-*` classes on one element.
- Status vocabulary: gold = the candidate's own input / active; ink = a deliberate flag (marked); red = wrong, unanswered, critical; green = eligible, correct (text `okInk`).
