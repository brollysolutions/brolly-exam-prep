# Claude Code workflow for TSLPRB

Everything here is wired so you do not have to name a skill. `CLAUDE.md` holds the routing table, `.claude/rules/*.md` load automatically by path, `.claude/hooks/skill-hint.mjs` adds a hint on every prompt, and subagents are invoked with `@name`.

## Daily loop
1. `claude --permission-mode auto` in the repo root (auto mode is the default on your plan; Shift+Tab cycles modes).
2. The `SessionStart` hook prints open features, open PRs and the next plan step.
3. Describe the work in plain words. Brainstorming → grilling → writing-plans → subagent-driven-development fire in order. Use `/grill-me` yourself when you want the relentless interview.
4. For long unattended runs: `/ralph-loop "implement F-09 through F-11 per docs/IMPLEMENTATION_PLAN.md" --max-iterations 20 --completion-promise "ALL_DONE"`.
5. Each feature ends with `@design-critic`, `@i18n-rtl-reviewer`, `/code-review`, and `@pr-tracker` (which opens the PR and updates the tracking docs). Pushing still asks you once.

## Inventory

### Plugins (user scope, `claude plugin list`)
| Plugin | Gives |
|---|---|
| `superpowers` 6.3.0 | brainstorming, writing-plans, subagent-driven-development, TDD, systematic-debugging, verification-before-completion, code-review request/receive, git worktrees |
| `expo` 1.12.3 | 24 skills: expo-router, expo-design-system, expo-native-ui, expo-animation, expo-tailwind-setup, expo-data-fetching, expo-ui, expo-dev-client, expo-upgrade, eas-* … |
| `frontend-design` | distinctive, non-generic UI direction |
| `code-review`, `pr-review-toolkit` | `/code-review`, PR review agents |
| `github` | GitHub MCP (issues, PRs) |
| `typescript-lsp` | type-aware navigation |
| `ralph-loop` | autonomous loop until a completion promise |

### Project skills (`.claude/skills/`, installed with `npx skills add …`, locked in `skills-lock.json`)
| Skill | Source | Use |
|---|---|---|
| `grill-me`, `grilling` | mattpocock/skills | relentless plan interview (`/grill-me` manual; `grilling` auto) |
| `to-spec`, `to-tickets` | mattpocock/skills | turn a discussion into a spec / tickets |
| `react-native-best-practices` | callstackincubator/agent-skills | performance |
| `design-audit`, `expo-liquid-glass` | devanshuDesai/agent-skills | 15-dimension UI audit; iOS glass in Expo |
| `apple-hig-designer` | tristan-mcinnis/apple-hig-designer-skill-2026 | Apple HIG (foundations, components, Liquid Glass) |
| `material-3` | hamen/material-3-skill | Material 3 tokens/components for Android |
| `ui-ux-pro-max` | nextlevelbuilder/ui-ux-pro-max-skill | palettes, font pairings, UX rules |
| `react-native-testing` | callstack/react-native-testing-library | RNTL v13/v14 testing patterns |

### MCP servers (`.mcp.json`, project scope)
| Server | Purpose | Notes |
|---|---|---|
| `expo` (https://mcp.expo.dev/mcp) | Expo docs search, EAS builds/workflows, store reviews, automation tools | run `/mcp` once to log in |
| `context7` (https://mcp.context7.com/mcp) | version-accurate library docs | add `CONTEXT7_API_KEY` header for higher limits |
| `github` (plugin) | issues/PRs | needs `gh auth login` or PAT |
| `maestro` | drive the USB Android phone, run `.maestro/*.yml` | only after installing Maestro CLI + adb: `claude mcp add --scope project maestro -- maestro mcp` |
| Chrome (claude-in-chrome) | in-browser review of `expo start --web` | needs the Claude Chrome extension connected |

### Subagents (`.claude/agents/`)
`ui-builder`, `design-critic`, `i18n-rtl-reviewer`, `test-writer`, `pr-tracker`, `backend-scaffolder`, `research`. Invoke with `@name` or let the routing table do it.

### Hooks (`.claude/settings.json` → `.claude/hooks/*.mjs`, Node, cross-platform)
| Event | Script | Effect |
|---|---|---|
| SessionStart | `session-brief.mjs` | prints open features / PRs / next plan step |
| UserPromptSubmit | `skill-hint.mjs` | injects matching skill names for the prompt |
| PostToolUse Edit/Write | `post-edit.mjs` | eslint --fix + tsc on the touched package; blocks with the errors |
| PostToolUse Bash | `track-pr.mjs` | on `gh pr create/merge`, updates `docs/PR_TRACKING.md` + `docs/FEATURES.md` |
| Stop | `stop-verify.mjs` | runs mobile tests if sources changed; blocks stop on red. Skipped while `.superpowers/sdd/.busy` exists (set by the controller while an implementer subagent owns the working tree) |

### Permissions (`.claude/settings.json`)
Allowed without prompting: pnpm/expo/jest/eslint/tsc, docker compose, non-destructive git, `gh pr create/view/list`, `gh issue`. Asks: `git push`, `gh pr merge`, `gh repo create`, `docker compose down -v`. Denied: force-push, `git reset --hard`, recursive deletes of roots, reading `.env`.

### GitHub
- `.github/workflows/ci.yml` — typecheck, lint, test, web export, API ruff+pytest.
- `.github/workflows/claude-review.yml` — Claude reviews every PR. Requires repo secret `ANTHROPIC_API_KEY` (or switch to `claude_code_oauth_token` via `/install-github-app`).
- PR template and feature issue template.

## Parallel implementers
One implementer at a time per checkout. To run a second one in parallel, give it its own git worktree (`git worktree add ../Tsplrb-<id> <branch>`), let it `pnpm install` there, and rebase the stacked branches afterwards. Reviewers are read-only and may overlap freely.

## Run the whole app in Docker (F-27)
Prereqs: Docker Engine with Compose v2 (Docker Desktop, or `docker-ce` + `docker-compose-plugin` on Linux); nothing else on the host — Node, pnpm and Python live in the images. BuildKit is used when the buildx plugin is present; without it Compose warns `Docker Compose requires buildx plugin to be installed` and builds with the legacy builder, which the Dockerfiles support (no `RUN --mount`). Install `docker-buildx-plugin` (or `docker-buildx` from the distro) for faster cached builds.
- `pnpm docker:up` (= `docker compose up -d --build`) builds and starts five services: `web` — the Expo static web export behind nginx — on http://localhost:3201, `api` (FastAPI; uvicorn `--reload` over the bind-mounted `services/api/app`) on http://localhost:8200 with Swagger at http://localhost:8200/docs, `worker` (arq crons), `postgres` (5432) and `redis` (6379). The dev OTP is `123456`.
- Login in Docker: any 10-digit number; the OTP screen shows the dev code 123456 (OTP_DEV_MODE) with a "Use this code" tap that fills the cells.
- `pnpm api:migrate` runs `alembic upgrade head` inside the api container (first boot and after every new migration). `pnpm docker:logs` tails web/api/worker; `pnpm docker:down` stops everything and keeps the database volume (`docker compose down -v` wipes it — ask first).
- Change ports without touching the compose file: `WEB_HOST_PORT`, `API_HOST_PORT`, `POSTGRES_HOST_PORT`, `REDIS_HOST_PORT` in a root `.env` or on the command line (`WEB_HOST_PORT=3211 pnpm docker:up`). The api's `CORS_ORIGINS` default follows `WEB_HOST_PORT`; the web image's `EXPO_PUBLIC_API_URL` build arg follows `API_HOST_PORT` and is baked into the bundle, so a new API port means rebuilding `web`. On this laptop other projects hold 3201 (`voice-agent-elevenlabs-console-1`) and 5432 (`voice-agent-elevenlabs-postgres-1`): stop them, or run `WEB_HOST_PORT=3211 POSTGRES_HOST_PORT=5434 pnpm docker:up`. Postgres and Redis are published on 127.0.0.1 only; api and web on all interfaces so a phone on the LAN can reach them (dev OTP is on — do not expose this stack beyond a trusted network).
- The web image is built from the repo root (`apps/mobile/Dockerfile`: node:22-alpine + pnpm 11.25.0 → `expo export --platform web` with `EXPO_PUBLIC_API=http` → `nginx:alpine`, `apps/mobile/nginx.conf`). The browser calls the API on the host port, so the URL is `http://localhost:8200`, never the compose service name. Edits under `apps/mobile` or `packages/*` are not live in the container: `docker compose build web && docker compose up -d web` (or `pnpm docker:up` again). API edits reload through the bind mount.
- 8 GB laptops: build one image at a time — `docker compose build web`, then `pnpm docker:up`. `expo export` wants ~2 GB inside the Docker VM, so stop other stacks first. For day-to-day app work keep using `pnpm web:mobile` / Expo Go with the mock API and run only the backend with `pnpm api:up`.
- What goes over the wire today: OTP request/verify and the attempt lifecycle (`POST /v1/attempts`, `PATCH …/answers`, `POST …/submit`, `GET /v1/results/{id}`). The test catalogue, the paper and the result analysis are served by `HttpApi` from the in-app fixture bank (`MockApi` fallback) until `GET /v1/tests/{id}/paper` exists. The API's fixture ids (`test-pwt-07`, `q-arith-*`) do not match the app's (`mock-07`, `q-ar-001#n`), so `POST /v1/attempts` answers 404 and the attempt runs on the local clock, as designed — aligning the two banks is an F-17 follow-up, not a Docker one. Because `history.record()` only runs after a successful submit, Home's "papers practised" and "best score" tiles stay empty in Docker until the two fixture banks are aligned.

## Testing notes
- Update snapshots with `pnpm --filter mobile exec jest -u` (or `--runInBand -u`). `pnpm --filter mobile test -- -u` silently runs nothing on pnpm 11 (double `--`).
- Jest runs with `testTimeout: 15000` and `maxWorkers: 50%`; digit-entry tests time out under full worker contention on this laptop.

## Handoff: user-level auto-mode environment
The session could not write `~/.claude/settings.json` (classifier). Add these lines to `autoMode.environment` yourself if you want this repo trusted in auto mode:
```
"**Trusted repo (TSLPRB)**: C:\Users\mouli\OneDrive\Documents\Desktop\Tsplrb and its GitHub origin once created — private; secrets only in `.env` files (gitignored); `services/api/.env.example` is safe to edit",
"**Local services (TSLPRB)**: Docker Compose (web on 3201, FastAPI on 8200, postgres:17 on 5432, redis:7 on 6379, arq worker) — dev only, never prod",
```

## Rulings / deviations log
- 2026-09-02 — `corepack enable` cannot write to `C:\Program Files\nodejs`; pnpm installed with `npm i -g pnpm` instead.
- 2026-09-02 — Expo Go only in this phase: MMKV, Unistyles, SMS auto-read, call detection are stubbed. The incoming-call overlay is a dev-only simulated state.
- 2026-09-02 — Live RTL mirroring uses explicit `useDir()` helpers; `I18nManager.forceRTL` is deferred (needs restart).
- 2026-09-03 — Urdu removed at the user's request (F-26). The app ships English + Telugu; `Lang` is `'en' | 'te'`, `ur.json` and the Nastaliq font are gone. The direction helpers stay wired but dormant (`isRTL()` is always false).
