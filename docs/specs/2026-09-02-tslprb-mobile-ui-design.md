# TSLPRB mobile UI — design spec

Date: 2026-09-02 · Status: approved (planning session) · Owner: product (you) · Implementer: Claude Code workflow

## 1. Purpose
Build the user-facing flow of a mock-test app for Telangana police recruitment (PWT) as a native mobile app, from the approved Claude Design prototype, with better execution (spacing, hierarchy, motion, platform idioms) and the same identity. This phase ships UI on mock data plus a backend scaffold; real OTP, payments and sync come later.

## 2. Users and constraints
- Aspirants for Constable (PC) and SI/ASI posts in Telangana, mostly on mid-range Android phones, often with poor connectivity. Telugu and Urdu readers are first-class; English is the default UI language.
- Must work offline during a test. Timer must survive backgrounding and calls.
- Single developer machine: Windows, no Android SDK, no Mac → Expo Go on a physical phone; web export for screenshots.

## 3. Scope
In: 7 prototype screens, 14 test states, 4 extra screens (splash/onboarding, home, test library, profile/settings), three languages with live RTL, local logic on fixtures, dev states screen, API scaffold (Docker: Postgres 17, Redis, FastAPI, arq scheduler), Next.js placeholder.
Out: real SMS OTP, payments, leaderboards, push, EAS builds, store submission, `I18nManager` restart-based RTL, native modules outside Expo Go.

## 4. Screens and routes (Expo Router, `apps/mobile/src/app`)
| Route | Screen | Key content (from prototype) |
|---|---|---|
| `(onboarding)/welcome` | Splash + 3 intro slides | brand block (PWT), 3 value props, Skip |
| `(auth)/login` | Phone login | hazard rail, brand kicker, title, +91 box, 10-digit field, 3×4 keypad, Continue (enabled at 10 digits) |
| `(auth)/otp` | OTP | Change number, 6 cells (current cell hivis border), auto-fill note, resend countdown 24 s, Verify (at 6 digits) |
| `(onboarding)/post` | Post | step "1 / 2", two selectable cards (Constable / SI-ASI), Continue |
| `(onboarding)/category` | Category | Back, step "2 / 2", 6-card grid with PWT qualifying %, Start free mock test |
| `(tabs)/index` | Home | greeting, next full mock card (Start now), last score, weak topics, streak, exam countdown, language chips |
| `(tabs)/tests` | Library | segmented Full / Sectional / Previous year; rows with duration, questions, Free/Locked, best score |
| `test/[id]/index` | Attempt | header (exit ✕, language chips, timer box), section tabs (locked glyph), 6 px progress rail with ticks, Q badge + marks chip + Marked chip, question, 4 options with key glyphs, time-on-question, footer (Clear, Mark; Prev, Questions n/N, Next) |
| same (sheet) | Palette | legend with counts, per-section groups (n/10), 6-col grid of 48 px cells in 5 states, current outline, dot for answered+marked, locked section dimmed, Submit |
| same (overlays) | Dialogs | exit / submit (3 stat tiles) / resume / auto-submit; toasts 5-min (hazard) and 1-min (flag); locked-section toast; offline banner (sand); simulated incoming-call overlay (dev only) |
| `test/[id]/result` | Result | back, title, "Your score" 62.25 / 100, Qualified chip, Cut-off, 01 Where you stand (rank, accuracy, avg time), 02 What cost you marks (3 rows with note + hazard value), 03 Do these three next (3 action cards), CTA Wrong answers + explanation |
| `test/[id]/solutions` | Solutions | back, Wrong (n) / All (n) chips, cards: badge ✓/✕, Q n, question, Your answer (flag block, only if wrong), Correct answer (hivis block), Why, your time · average |
| `(tabs)/profile` | Profile | post, category, language, daily reminder toggle, log out, delete account (confirm) |
| `dev/states` | State matrix | prototype's 14 states + language toggle; not linked from production UI |

## 5. Test-attempt state machine
States: `idle → running → (paused by dialog) → submitted | autoSubmitted`. Store (zustand, persisted via `expo-sqlite/kv-store`): `attemptId, testId, pattern, endsAt (epoch ms), current, answers{n:0-3}, marked{n:true}, visited{n:true}, elapsedOnCurrent, sectionUnlocked[]`.
- Timer: `remaining = max(0, endsAt - now)` recomputed every second while foregrounded; on `AppState` → active after ≥ 2 s away show the **resume** dialog; when `remaining === 0` fire **auto-submit** dialog and freeze input.
- Warnings: toast at 300 s (hazard) and 60 s (flag); rail turns flag and marquees under 60 s; timer box fills hazard/flag.
- Section lock: `unlockAfter` section must be fully answered; tapping a locked tab or cell shows the locked toast.
- Palette state per cell: `nv` (not visited), `na` (visited, no answer), `a`, `m`, `am`. Legend counts derive from the same map.
- Submit: dialog with answered / not answered / marked tiles → result route. Offline: submission queued (banner copy), result shown from fixtures.

## 6. Design system
See `docs/DESIGN_SYSTEM.md`. Tokens live in `packages/design-tokens/tokens.json`; Tailwind preset generated from it. Key rules: sharp radii (2–4), hazard rail, kickers, 48/56 px targets, borders not shadows, hi-vis only for the single primary action per screen.

## 7. Styling stack (ruling 2026-09-02)
NativeWind 4.2 + Tailwind 3.4 (stable; className on every RN component via babel preset). The official Expo skill describes NativeWind 5 preview + Tailwind 4 + react-native-css; rejected for this phase because it is preview software and requires wrapping every component. Revisit when NativeWind 5 is GA. Fallback if Metro breaks: `StyleSheet` with the same token object (component API unchanged).

## 8. i18n and RTL
`@tslprb/i18n`: i18next with `en/te/ur` resources (parity-tested), `useDir()` returning `row`, `textAlign`, `start/end`, chevrons, `pick()`; `dir(d, ltr, rtl)` for classes; `<Num>` isolates digits LTR. Fonts via `@expo-google-fonts` packages loaded with `useFonts` in the root layout; `useTypography(role, weight)` resolves family/size/line-height per language (te ≥ 1.6, ur ≥ 2.0). Language is switchable from Home, Profile and the test header; switching never restarts the app.

## 9. Data layer
`apps/mobile/src/data`: `ApiClient` interface from `@tslprb/api-contracts`; `MockApi` implementation backed by `@tslprb/fixtures` with realistic latency (150–400 ms) and an `EXPO_PUBLIC_API=mock|http` switch; zustand stores: `session` (phone, token, post, category, lang), `attempt` (above), `library`. Persistence adapter: `expo-sqlite/kv-store` (works in Expo Go); MMKV later.

## 10. Backend scaffold
`services/api` FastAPI with `/health`, OTP (dev code 123456), tests, attempts, results; SQLAlchemy models + Alembic initial migration; `arq` worker cron: auto-submit expired attempts (1 min), purge OTPs (10 min), recompute leaderboard (nightly). `docker-compose.yml` profile `dev`: postgres:17, redis:7, api, worker. Contracts mirrored in `packages/api-contracts` (zod) and regenerated from OpenAPI.

## 11. Testing
Unit: jest-expo + RNTL; stores and helpers (timer math, palette counts, section lock, OTP countdown, `useDir`); locale parity; Urdu snapshot per screen. E2E: Maestro flows in `.maestro/` (optional locally; runs in EAS Workflows later). Visual: web export screenshots per language reviewed by `@design-critic` before each PR.

## 12. Delivery
One PR per feature ID (`docs/FEATURES.md`), tracked in `docs/PR_TRACKING.md`; CI runs typecheck/lint/test/web-export and API ruff+pytest; Claude reviews every PR via GitHub Action.

## 13. Open items (not blocking)
- SI section split needs confirmation against the TSLPRB notification (`PWT_SI.verified=false`).
- Category qualifying percentages are prototype values.
- Extra-screen Telugu/Urdu strings were machine-authored; a native reviewer should proof them.
