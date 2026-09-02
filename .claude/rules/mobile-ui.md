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
