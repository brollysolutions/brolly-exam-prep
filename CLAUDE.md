# TSLPRB Mobile — project guide for Claude Code

Mock-test app for Telangana State Level Police Recruitment Board (PWT = Preliminary Written Test).
Monorepo: Expo SDK 57 mobile app (Android-first, iOS-ready), Next.js placeholder site, FastAPI scaffold.
Design identity: "hi-vis on tar" — yellow `#FFE01B` on near-black, Archivo type, sharp 3px radii. Never soften it.
Languages: **English default**, Telugu. Two languages only (Urdu removed 2026-09-03, F-26); the direction helpers stay wired but RTL is dormant.

## Layout
- `apps/mobile` — Expo Router app (`src/app` routes, `src/ui` primitives, `src/features/*`, `src/data` store + mock API). Read `apps/mobile/AGENTS.md` (Expo's own guidance) when working there.
- `apps/web` — Next.js placeholder (landing only).
- `packages/design-tokens` (`@tslprb/design-tokens`) — the ONLY source of colors/spacing/type. Tailwind preset + TS.
- `packages/i18n` (`@tslprb/i18n`) — en/te strings, i18next init, `useDir()` direction helpers (RTL dormant).
- `packages/api-contracts` (`@tslprb/api-contracts`) — zod schemas + types shared by app and API.
- `packages/fixtures` (`@tslprb/fixtures`) — exam pattern config, question bank (en/te), sample results.
- `services/api` — FastAPI + SQLAlchemy 2 + Alembic + arq worker; `docker-compose.yml` profile `dev` (postgres:17, redis:7).
- `prototype/` — the approved Claude Design prototype. `prototype/extracted/template.html` is the readable source of every screen, state, string and colour. Treat it as the spec for content and behaviour.
- `docs/` — `IMPLEMENTATION_PLAN.md` (live checklist), `FEATURES.md`, `PR_TRACKING.md`, `WORKFLOW.md`, `DESIGN_SYSTEM.md`, `specs/`.

## Commands
```
pnpm dev:mobile          # expo start (scan QR with Expo Go on Android)
pnpm web:mobile          # expo web preview in the browser
pnpm typecheck | lint | test
pnpm doctor              # expo-doctor
pnpm api:up | api:down | api:migrate
```

## Skill routing (automatic — do not wait to be told)
Invoke the listed skill(s) BEFORE starting work that matches. Process skills first, then domain skills.

| Task involves | Invoke |
|---|---|
| Any new feature, screen, or behaviour change (before code) | `superpowers:brainstorming` → if decisions remain open, `grilling`; then `superpowers:writing-plans` |
| Executing a written plan | `superpowers:subagent-driven-development` (or `executing-plans`) |
| New screen / component / layout in `apps/mobile` | `expo-router` → `expo-design-system` → `frontend-design` → `apple-hig-designer` + `material-3` (platform idioms) → `ui-ux-pro-max` for typography/palette checks |
| Tailwind / NativeWind setup or class issues | `expo-tailwind-setup` |
| Animation, gesture, bottom sheet, haptics | `expo-animation` |
| Native controls, SF Symbols, glass/blur | `expo-native-ui`, `expo-liquid-glass` |
| Telugu strings, fonts, direction helpers, `useDir` | `.claude/rules/i18n-rtl.md` is auto-loaded; run `@i18n-rtl-reviewer` before PR |
| Lists, FPS, re-renders, startup, bundle size | `react-native-best-practices` |
| Writing or fixing tests | `superpowers:test-driven-development` + `react-native-testing` (if installed) |
| Data fetching / API layer | `expo-data-fetching`; contracts live in `packages/api-contracts` |
| Bug, failing test, unexpected behaviour | `superpowers:systematic-debugging` |
| Before opening a PR | `design-audit` on changed screens → `@design-critic` → `code-review` → `@pr-tracker` |
| Claiming done / passing | `superpowers:verification-before-completion` |
| EAS build / update / store submission | `eas-workflows`, `eas-app-stores`, `expo-dev-client` |
| Upgrading Expo SDK | `expo-upgrade` |
| Turning a discussion into a spec / tickets | `to-spec`, `to-tickets` |

`/grill-me` is manual by design (Matt Pocock's skill) — run it at the start of any new spec.

## Definition of done (every feature PR)
1. `pnpm typecheck && pnpm lint && pnpm test` green (hooks enforce this on edit/stop).
2. Screen renders in en and te; no hard-coded hex or strings.
3. Unit tests for logic (timer, palette counts, OTP countdown, direction helpers); snapshot in `te`.
4. Visually checked in the web preview or Expo Go in en and te.
5. `docs/FEATURES.md` + `docs/PR_TRACKING.md` updated (the `track-pr` hook does it on `gh pr create/merge`; verify).

## Conventions
- Branch `feat/F-xx-slug`, `fix/…`, `chore/…`. Conventional commits. One feature ID per PR.
- TypeScript strict; no `any`. Components are function components with explicit prop types.
- Styling: NativeWind classes bound to tokens (`bg-tar`, `text-hivis`, `border-line`). No inline hex. Use `dir()` / `useDir()` for anything directional.
- Touch targets ≥ 48px. Respect reduced motion. Numbers always tabular and LTR (`<Num>`).
- Never use `I18nManager.forceRTL` in this phase.
- Expo Go only: do not add native modules outside the Expo Go allowlist without a documented ruling in `docs/WORKFLOW.md`.
- Secrets only in `.env` (gitignored). Never commit tokens.
- Do not push, force-push, or merge without confirmation; PR creation is fine.
