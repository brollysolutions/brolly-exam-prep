# Implementation plan — TSLPRB mobile (live checklist)

Approved 2026-09-02. Full rationale and decisions: `docs/specs/2026-09-02-tslprb-mobile-ui-design.md`. Feature status: `docs/FEATURES.md`. PRs: `docs/PR_TRACKING.md`. Tick items as they land; add dated rulings under "Deviations".

## Phase 0 — Toolchain
- [x] pnpm 11 (via `npm i -g pnpm`; corepack blocked by Program Files permissions)
- [x] GitHub CLI 2.98 (`winget`) — `gh auth login` still required (pause point)
- [x] Plugins: expo, frontend-design, code-review, github, pr-review-toolkit, typescript-lsp, ralph-loop
- [x] Skills: grill-me, grilling, to-spec, to-tickets, react-native-best-practices, design-audit, expo-liquid-glass, material-3, ui-ux-pro-max, apple-hig-designer
- [x] Skill: react-native-testing (callstack/react-native-testing-library)
- [x] MCPs: expo, context7 (`.mcp.json`)
- [ ] Optional: Android platform-tools (adb) + Maestro CLI + `maestro` MCP

## Phase 1 — Workflow layer
- [x] `CLAUDE.md` with skill routing table and definition of done
- [x] `.claude/rules/` mobile-ui, i18n-rtl, api, docs
- [x] `.claude/agents/` ui-builder, design-critic, i18n-rtl-reviewer, test-writer, pr-tracker, backend-scaffolder, research
- [x] `.claude/hooks/` post-edit, stop-verify, track-pr, session-brief, skill-hint + `.claude/settings.json`
- [x] `.github/` ci.yml, claude-review.yml, PR template, issue template
- [x] `docs/` FEATURES, PR_TRACKING, WORKFLOW, DESIGN_SYSTEM, IMPLEMENTATION_PLAN
- [x] `docs/specs/2026-09-02-tslprb-mobile-ui-design.md`
- [ ] Add this repo to user-level `autoMode.environment` — proposed lines are in `docs/WORKFLOW.md` § Handoff; the auto-mode classifier blocked writing user settings from the session
- [x] Hooks smoke-tested (`node .claude/hooks/session-brief.mjs`, `skill-hint.mjs` with a sample prompt)

## Phase 2 — Monorepo scaffold
- [x] `pnpm-workspace.yaml` (hoisted linker, build allowlist), root `package.json`, `.gitignore`, prettier
- [x] `apps/mobile` from `create-expo-app` (SDK 57, `src/app` router) + deps installed
- [x] `apps/web` Next.js placeholder (F-18)
- [x] `packages/design-tokens`, `packages/i18n`, `packages/api-contracts`, `packages/fixtures`
- [x] `services/api` + `docker-compose.yml` (F-17, branch feat/F-17-api-scaffold)
- [x] `git` initial commit on `main` (c823868) · [ ] `gh repo create` (pause point)

## Phase 3 — Design system (F-01)
- [x] Tokens (TS + Tailwind theme) from prototype palette
- [x] Fonts loaded via `useFonts` (Inter + Playfair Display since F-28, Noto Sans Telugu; Archivo retired, Noto Nastaliq Urdu removed in F-26); `useTypography()`
- [x] `@tslprb/i18n`: en/te locales (all prototype strings; `ur` removed in F-26), i18next init, `useDir()`, `dir()`, `<Num>`
- [x] Primitives in `apps/mobile/src/ui`
- [x] Motion helpers (sheet/fade/toast/hazard marquee) with reduced-motion
- [x] `src/app/dev/states.tsx` primitive gallery + language toggle (the 14 test states arrive with F-11)
- [x] Jest + RNTL configured; locale parity test; RTL helper tests

## Phase 4 — Screens (one PR each; order below)
- [x] F-15 exam pattern config + fixtures
- [x] F-16 persistence + mock API adapter (reviewed)
- [x] F-03 login · [x] F-04 OTP · [x] F-05 post · [x] F-06 category (reviewed; branch feat/F-03-06-auth-onboarding)
- [x] F-09 attempt core · [x] F-10 palette · [x] F-11 dialogs/toasts/banners/call overlay (reviewed; branch feat/F-09-11-test-attempt)
- [x] F-12 result · [x] F-13 solutions (reviewed; branch feat/F-12-13-result-solutions)
- [x] F-02 splash/onboarding · [x] F-07 home · [x] F-08 test library · [x] F-14 profile/settings (reviewed; branch feat/F-02-07-08-14-shell)
- [x] F-19 guest mode — the app opens on Home with no login; `useRequireAuth().ensure()` asks for phone + post + category only when an action needs an account (Start now, a library row, the Profile account rows) and returns to what was tapped, and `test/[id]` redirects a deep link through the same `gateHref` before it loads a paper; signed-out Profile keeps the app settings and offers a sign-in card (main)
- [x] F-20 home re-layout — Home is a hub, not a report card: the last-score card and the weak-topics list are gone, replaced by three option cards in the order a candidate reaches for them (Study material → `/(tabs)/study`, Previous question papers → `/(tabs)/tests?kind=previous`, and the mock last as the only hi-vis action); the first two are ungated for guests and signed-in users alike (main)
- [x] F-21 study material — a Study tab between Home and Tests; `packages/fixtures/src/study.ts` carries 11 syllabus topics (arithmetic, reasoning, general studies, Telangana) written in en/te/ur as six block kinds; the reader renders them with a language switcher in its header, hi-vis and sand 3 px start edges that mirror in Urdu, a mark-as-read store (`tslprb.study`) and an ungated hand-off to the sectional drills; free for guests
- [x] F-22 previous question papers — a previous-year row offers Practise (through the F-19 gate) and View paper (ungated: `/paper/[id]` renders every question with its answer key, a 3 px hi-vis start bar and ✓ on the correct option, and the explanation under a `Why` kicker, with section chips that jump the list); the library reads `?kind=` off the URL so Home's card lands on the previous shelf, and both `prev-*` fixtures are free (main)
- [x] F-23 home v3 — the dashboard stops repeating the tab bar: a hazard-framed exam countdown hero (days to `EXAM_INFO.pwtDate`, streak, and a today's-target bar of ten `View` blocks fed by the new `tslprb.activity` store), no Continue card (removed at the user's request 2026-09-03); "Check eligibility" is the only hi-vis action, a horizontal shelf of TSLPRB notices, a PMT/PET eligibility card, three current-affairs rows and three progress tiles (topics read n/N, papers practised, best score) with a guest nudge; `activity.bump()` is wired from the attempt route's answer handler and the topic route's mark-read and `history.record()` from the attempt route after the API scores the paper, so no store imports another; the Study / Previous papers / Mock cards and their strings are removed. the notice and affair rows are the three newest of F-24's fixtures with F-24's own kind and category labels, and `/eligibility` reaches F-25's checker; fix wave 1: best score as a percentage ranked by share of marks, hero not a button with exam-day / held states, isolated streak digit with a singular form, notice cards deep-link to `/updates?open=<id>`, empty shelves hidden, Urdu shelf starts at the newest notice, `useNow` refreshes on focus, dead `lastRead` bookmark removed (main)
- [x] F-24 TSLPRB updates + current affairs — `/updates` lists the Board's notice board (six seeded notices for a 2026 cycle, kind chip, `<Num>` date, body behind a tap with a mirrored caret and an `expanded` accessibility state, link row to tslprb.in where the notice has one) and `/affairs` the daily digest (ten seeded items grouped by day under a `<Num>` date kicker, `sand` category kicker per card); both free for guests, both fed by INVENTED sample fixtures (`packages/fixtures/src/notices.ts`, `affairs.ts`) that are marked as such and must be replaced by the API before launch; until then a static "Sample data" tag (`common.sampleData`, `Chip tone="label"`) labels the Home rows and both screen headers; fix wave 1: `?open=<id>` deep link, animated disclosure with a turning caret, centred empty states, sand start edge on affairs cards (main)
- [x] F-25 PMT/PET eligibility checker — `/eligibility` (ungated, free for guests): post x gender x category-group pickers, decimal-pad measurement fields built from `standardEntries()` so a woman is never asked for a chest measurement, and a pure `evaluate()` that returns one row per standard (required vs yours, boundary counts as a pass) plus a verdict — eligible / not yet with the shortfalls listed / incomplete, a confirmed failure outranking a blank field. `packages/fixtures/src/physical-standards.ts` holds the post x gender x group table with per-field `verified` flags and per-post run events (1600 m constable men, 800 m constable women, 100 m + 800 m SI); the Constable PMT + PET figures are confirmed (research 2026-09-03), the ST men's chest and every SI figure are unconfirmed and tagged on their rows, with an SI note under the pickers. Last entry persists in `tslprb.eligibility`. Fix wave 1: the long runs are entered as mm:ss in two fields and stored as seconds (`runTime.ts`), the limit prints as `7:15`, the unconfirmed note is driven by `allVerified`, fields carry their standard as a placeholder, run labels and the disclaimer year are `iso()` interpolations, quiet full-width pickers, columned result rows, scroll-to-verdict
- [x] F-26 two languages — Urdu removed at the user's request (2026-09-03): `Lang` is `'en' | 'te'` across i18n, tokens, contracts, fixtures and the API; `ur.json`, the Nastaliq font and every `ur` branch are gone; switchers offer EN / తె; `?lang=ur` falls back to English; the six Urdu snapshot tests are Telugu ones now; direction helpers stay wired but dormant (main)

- [x] F-28 Brolly rebrand, Phase A (foundation) — semantic tokens on cream with `legacyColors` aliases and contrast/legacy tests; Inter + Playfair Display; every `src/ui` primitive on semantic names (ink primary, gold marks, red outlines, `Rail` for the critical clock, brand palette semantics); the `Brand` lockup on Home/Login/gallery and the full logo on Welcome; light splash, navy/gold app icon, `make-brand-assets.mjs`; docs rewritten. Six commits on main (A1 tokens → A2 fonts → A3a/A3b primitives → A4 brand → A5 splash/icons/docs), each green. Phases B (shell screens, F-29), C (content, F-30), D (attempt/result, F-31), E (legacy rename) follow

## Phase 5 — Backend scaffold (F-17)
- [x] FastAPI app, routers, models, Alembic initial migration, arq worker with 3 cron jobs
- [x] `docker-compose.yml`: postgres:17, redis:7, api, worker (the `dev` profile was removed in F-27)
- [x] `packages/api-contracts` zod schemas + `ApiClient` interface · [ ] `pnpm contracts:gen` (needs live API)
- [x] F-27 whole-app Docker stack — `pnpm docker:up` runs `web` (Expo static web export behind nginx, `apps/mobile/Dockerfile` + `nginx.conf`, built from the repo root with `EXPO_PUBLIC_API=http`) on :3201, `api` on :8200 (uvicorn 8000 inside, `--reload` bind mount, `/health` healthcheck, `CORS_ORIGINS` follows `WEB_HOST_PORT`), `worker`, postgres :5432, redis :6379; no compose profiles; root `.dockerignore`; `docker:*` / `api:*` scripts; `docker compose build web api` job in CI; `HttpApi` serves the catalogue, paper and analysis from the fixture bank until `/v1/tests/{id}/paper` exists (main)

## Phase 6 — Verification
- [x] `pnpm typecheck && pnpm lint && pnpm test` green on the stack tip (478 mobile tests, 67 suites; i18n 6/6; package typechecks)
- [ ] `npx expo-doctor` clean; app opens in Expo Go on Android (needs your phone: `pnpm dev:mobile`)
- [x] Every screen visually reviewed by `@design-critic` in en/te (and ur, before F-26) on the web export
- [x] Telugu snapshot tests for every screen (were Urdu until F-26)
- [x] Timer deadline tests (background/foreground, auto-submit) — countdown + route tests
- [x] `docker compose --profile dev up` → `/health` 200; worker registers cron jobs (verified by F-17 implementer on ports 5434/8010)
- [ ] FEATURES/PR_TRACKING complete and consistent with `gh pr list` (PRs open after `gh auth login` + repo creation)

## Deviations / rulings
- 2026-09-05 — Brolly rebrand: light cream theme, ink primaries, gold accents, Inter + Playfair; hi-vis/hazard identity retired. Palette semantics are the brand's (gold = answered, ink = marked, red outline = unanswered, plain = unvisited). Legacy colour names stay as aliases until Phase E; `src/ui` is semantic-only from Phase A. Pressed feedback is a `surface2` fill, not opacity.
- 2026-09-05 — Whole-app Docker stack: web (Expo static export behind nginx) on 3201, API on 8200, no compose profiles; the web image is built with `EXPO_PUBLIC_API=http` against `http://localhost:8200`. `HttpApi` reads the catalogue/paper/analysis from the in-app fixture bank rather than rejecting 501, so the Dockerised app is playable; the API's fixture ids still differ from the app's (`test-pwt-07` vs `mock-07`), so attempts run on the local clock until F-17 aligns them.
- 2026-09-05 — The hazard stripe is no longer screen chrome (user ruling): `Screen` defaults to `rail={false}` on every route; the attempt screen raises it only while the timer is critical.
- 2026-09-02 — Branches are stacked (main ← F-17 ← F-01 ← F-16 ← …) instead of merged locally, so each feature still gets its own PR once the GitHub repo exists.
- 2026-09-02 — ESLint pinned to 9.x in apps/mobile: eslint-config-expo 57's react plugin crashes on ESLint 10. `lint` script is `eslint .` (expo lint hard-codes a non-hoisted path).
- 2026-09-02 — Styling stack decided after checking the official `expo-tailwind-setup` skill; see spec §Styling for the final choice and why.
- 2026-09-03 — Home's Continue card removed at the user's request; "Check eligibility" is Home's one hi-vis action. Notice/affairs rows carry a "Sample data" chip until the API serves live content.
- 2026-09-03 — PET restructured per post after research: Constable is three events (1600 m men / 800 m women, long jump, shot put), 100 m is SI-only; unconfirmed figures are tagged on the row.
- 2026-09-03 — Urdu removed at the user's request; the app ships English + Telugu. Direction helpers kept, dormant.

## Handoff (2026-09-03) — what needs you
1. `gh auth login`, then create the repo and push the stack in order (each PR's base is the branch below it):
   `gh repo create <owner>/tslprb --private --source . --remote origin --push` (pushes the current branch); then `git push -u origin main feat/F-17-api-scaffold feat/F-01-design-system feat/F-16-data-layer feat/F-09-11-test-attempt feat/F-03-06-auth-onboarding feat/F-12-13-result-solutions feat/F-02-07-08-14-shell`, and `gh pr create --base <previous-branch> --head <branch> --fill` for each, bottom-up. `@pr-tracker` (or the `track-pr` hook) fills `docs/PR_TRACKING.md`.
2. Repo secret `ANTHROPIC_API_KEY` (or `/install-github-app`) so `.github/workflows/claude-review.yml` can review PRs.
3. `services/api/.env.example`: delete the two `JWT_SECRET` lines (+ comment) and set `CORS_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:3000`. The project deny rule on `.env*` blocked the session from editing it.
4. Run on your phone: `pnpm dev:mobile`, scan with Expo Go; check the critical-time rail on the attempt screen, sheet/dialog motion, Telugu line-heights, tab-bar height (te 68), the Toggle.
5. Optional: connect the Claude Chrome extension for in-browser review, install adb + Maestro for `.maestro/` flows, add `context7` API key header in `.mcp.json`.
6. Delete the leftover folder `..\Tsplrb-w4` (a OneDrive lock stopped the session from removing it).

## Follow-ups (not blocking)
- `apps/web/.eslintrc.json` is legacy eslintrc driven by `next lint`, which prints a deprecation notice and goes away in Next 16 — migrate to flat config (code review F-23-25, M9).
- `docs/PR_TRACKING.md` has no rows for F-23 / F-24 / F-25 until the PRs are actually opened against the GitHub repo (code review F-23-25, M10).
- The unlit target-bar block on Home is `line3` (design review F-23-25, 22); a token-level 3:1 neutral for empty progress states is still to be added to `@tslprb/design-tokens`.
- `Dialog` `onDismiss` (Android back + scrim) — `TODO(follow-up)` in `src/ui/Dialog.tsx`.
- Web hydration mismatch (React #418): static HTML is pre-rendered in the default language.
- Per-language line-height is one multiplier per language (te 1.65) rather than per role.
- API: routers still serve fixtures in-memory; crons read DB tables the routers don't write yet; leaderboard stub.
- SI exam-pattern section split unverified (`PWT_SI.verified=false`); category qualifying % are prototype values; extra-screen te copy needs a native read.
- Pre-existing en keys `auth.phoneHint`, `onboarding.welcome1Sub`, `test.warn5`, `test.warn1` bake digits into strings (same rule class as the eligibility `runTime` fix, F-23-25 fix1 review #7) — interpolate the numbers instead.
