# Implementation plan — TSLPRB mobile (live checklist)

Approved 2026-09-02. Full rationale and decisions: `docs/specs/2026-09-02-tslprb-mobile-ui-design.md`. Feature status: `docs/FEATURES.md`. PRs: `docs/PR_TRACKING.md`. Tick items as they land; add dated rulings under "Deviations".

## Phase 0 — Toolchain
- [x] pnpm 11 (via `npm i -g pnpm`; corepack blocked by Program Files permissions)
- [x] GitHub CLI 2.98 (`winget`) — `gh auth login` still required (pause point)
- [x] Plugins: expo, frontend-design, code-review, github, pr-review-toolkit, typescript-lsp, ralph-loop
- [x] Skills: grill-me, grilling, to-spec, to-tickets, react-native-best-practices, design-audit, expo-liquid-glass, material-3, ui-ux-pro-max, apple-hig-designer
- [ ] Skill: react-native-testing (install did not resolve; retry via `npx skills find`)
- [x] MCPs: expo, context7 (`.mcp.json`)
- [ ] Optional: Android platform-tools (adb) + Maestro CLI + `maestro` MCP

## Phase 1 — Workflow layer
- [x] `CLAUDE.md` with skill routing table and definition of done
- [x] `.claude/rules/` mobile-ui, i18n-rtl, api, docs
- [x] `.claude/agents/` ui-builder, design-critic, i18n-rtl-reviewer, test-writer, pr-tracker, backend-scaffolder, research
- [x] `.claude/hooks/` post-edit, stop-verify, track-pr, session-brief, skill-hint + `.claude/settings.json`
- [x] `.github/` ci.yml, claude-review.yml, PR template, issue template
- [x] `docs/` FEATURES, PR_TRACKING, WORKFLOW, DESIGN_SYSTEM, IMPLEMENTATION_PLAN
- [ ] `docs/specs/2026-09-02-tslprb-mobile-ui-design.md`
- [ ] Add this repo to user-level `autoMode.environment` (show diff first)
- [ ] Hooks smoke-tested (`node .claude/hooks/session-brief.mjs`, `skill-hint.mjs` with a sample prompt)

## Phase 2 — Monorepo scaffold
- [x] `pnpm-workspace.yaml`, `.npmrc` (hoisted), root `package.json`, `.gitignore`, prettier
- [x] `apps/mobile` from `create-expo-app` (SDK 57, `src/app` router) + deps installed
- [ ] `apps/web` Next.js placeholder (F-18)
- [ ] `packages/design-tokens`, `packages/i18n`, `packages/api-contracts`, `packages/fixtures`
- [ ] `services/api` + `docker-compose.yml` (F-17)
- [ ] `git` initial commit on `main`; `gh repo create` (pause point)

## Phase 3 — Design system (F-01)
- [ ] Tokens (TS + Tailwind theme) from prototype palette
- [ ] Fonts loaded via `useFonts` (Archivo, Noto Sans Telugu, Noto Nastaliq Urdu); `useTypography()`
- [ ] `@tslprb/i18n`: en/te/ur locales (all prototype strings), i18next init, `useDir()`, `dir()`, `<Num>`
- [ ] Primitives in `apps/mobile/src/ui`
- [ ] Motion helpers (sheet/fade/toast/hazard marquee) with reduced-motion
- [ ] `src/app/dev/states.tsx` state matrix (14 states + language toggle)
- [ ] Jest + RNTL configured; locale parity test; RTL helper tests

## Phase 4 — Screens (one PR each; order below)
- [ ] F-15 exam pattern config + fixtures
- [ ] F-16 persistence + mock API adapter
- [ ] F-03 login · [ ] F-04 OTP · [ ] F-05 post · [ ] F-06 category
- [ ] F-09 attempt core · [ ] F-10 palette · [ ] F-11 dialogs/toasts/banners/call overlay
- [ ] F-12 result · [ ] F-13 solutions
- [ ] F-02 splash/onboarding · [ ] F-07 home · [ ] F-08 test library · [ ] F-14 profile/settings

## Phase 5 — Backend scaffold (F-17)
- [ ] FastAPI app, routers, models, Alembic initial migration, arq worker with 3 cron jobs
- [ ] `docker-compose.yml` profile dev: postgres:17, redis:7, api, worker
- [ ] `packages/api-contracts` zod schemas + `ApiClient` interface; `pnpm contracts:gen`

## Phase 6 — Verification
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green at root
- [ ] `npx expo-doctor` clean; app opens in Expo Go on Android
- [ ] Web export screenshots (en/te/ur) for every screen reviewed by `@design-critic`
- [ ] Urdu snapshot tests for every screen
- [ ] Timer deadline tests (background/foreground, auto-submit)
- [ ] `docker compose --profile dev up` → `/health` 200; worker registers cron jobs
- [ ] FEATURES/PR_TRACKING complete and consistent with `gh pr list`

## Deviations / rulings
- 2026-09-02 — Styling stack decided after checking the official `expo-tailwind-setup` skill; see spec §Styling for the final choice and why.
