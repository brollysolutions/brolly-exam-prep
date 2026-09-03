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
- [x] Fonts loaded via `useFonts` (Archivo, Noto Sans Telugu, Noto Nastaliq Urdu); `useTypography()`
- [x] `@tslprb/i18n`: en/te/ur locales (all prototype strings), i18next init, `useDir()`, `dir()`, `<Num>`
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

## Phase 5 — Backend scaffold (F-17)
- [x] FastAPI app, routers, models, Alembic initial migration, arq worker with 3 cron jobs
- [x] `docker-compose.yml` profile dev: postgres:17, redis:7, api, worker
- [x] `packages/api-contracts` zod schemas + `ApiClient` interface · [ ] `pnpm contracts:gen` (needs live API)

## Phase 6 — Verification
- [x] `pnpm typecheck && pnpm lint && pnpm test` green on the stack tip (347 mobile tests, 51 suites; i18n 6/6; package typechecks)
- [ ] `npx expo-doctor` clean; app opens in Expo Go on Android (needs your phone: `pnpm dev:mobile`)
- [x] Web export screenshots (en/te/ur) for every screen reviewed by `@design-critic` (`docs/screenshots/*`)
- [x] Urdu snapshot tests for every screen
- [x] Timer deadline tests (background/foreground, auto-submit) — countdown + route tests
- [x] `docker compose --profile dev up` → `/health` 200; worker registers cron jobs (verified by F-17 implementer on ports 5434/8010)
- [ ] FEATURES/PR_TRACKING complete and consistent with `gh pr list` (PRs open after `gh auth login` + repo creation)

## Deviations / rulings
- 2026-09-02 — Branches are stacked (main ← F-17 ← F-01 ← F-16 ← …) instead of merged locally, so each feature still gets its own PR once the GitHub repo exists.
- 2026-09-02 — ESLint pinned to 9.x in apps/mobile: eslint-config-expo 57's react plugin crashes on ESLint 10. `lint` script is `eslint .` (expo lint hard-codes a non-hoisted path).
- 2026-09-02 — Styling stack decided after checking the official `expo-tailwind-setup` skill; see spec §Styling for the final choice and why.

## Handoff (2026-09-03) — what needs you
1. `gh auth login`, then create the repo and push the stack in order (each PR's base is the branch below it):
   `gh repo create <owner>/tslprb --private --source . --remote origin --push` (pushes the current branch); then `git push -u origin main feat/F-17-api-scaffold feat/F-01-design-system feat/F-16-data-layer feat/F-09-11-test-attempt feat/F-03-06-auth-onboarding feat/F-12-13-result-solutions feat/F-02-07-08-14-shell`, and `gh pr create --base <previous-branch> --head <branch> --fill` for each, bottom-up. `@pr-tracker` (or the `track-pr` hook) fills `docs/PR_TRACKING.md`.
2. Repo secret `ANTHROPIC_API_KEY` (or `/install-github-app`) so `.github/workflows/claude-review.yml` can review PRs.
3. `services/api/.env.example`: delete the two `JWT_SECRET` lines (+ comment) and set `CORS_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:3000`. The project deny rule on `.env*` blocked the session from editing it.
4. Run on your phone: `pnpm dev:mobile`, scan with Expo Go; check hazard-rail marquee, sheet/dialog motion, Nastaliq line-heights, tab-bar heights (te 68 / ur 76), the Toggle. Screenshots so far are from the web export (`docs/screenshots/*`).
5. Optional: connect the Claude Chrome extension (or keep `pnpm screenshots`), install adb + Maestro for `.maestro/` flows, add `context7` API key header in `.mcp.json`.
6. Delete the leftover folder `..\Tsplrb-w4` (a OneDrive lock stopped the session from removing it).

## Follow-ups (not blocking)
- `Dialog` `onDismiss` (Android back + scrim) — `TODO(follow-up)` in `src/ui/Dialog.tsx`.
- Web hydration mismatch (React #418): static HTML is pre-rendered in the default language.
- Urdu "صاف کریں" wraps in the 92 px Clear button.
- Per-language line-height is one multiplier per language (te 1.65 / ur 2.05) rather than per role.
- API: routers still serve fixtures in-memory; crons read DB tables the routers don't write yet; leaderboard stub.
- SI exam-pattern section split unverified (`PWT_SI.verified=false`); category qualifying % are prototype values; extra-screen te/ur copy needs a native read.
