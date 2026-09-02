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
| Chrome (claude-in-chrome) | screenshots of `expo start --web` for design review | needs the Claude Chrome extension connected; fallback: `pnpm --filter mobile export:web && pnpm screenshots` (headless Playwright, `scripts/screenshots.mjs`) |

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

## Rulings / deviations log
- 2026-09-02 — `corepack enable` cannot write to `C:\Program Files\nodejs`; pnpm installed with `npm i -g pnpm` instead.
- 2026-09-02 — Expo Go only in this phase: MMKV, Unistyles, SMS auto-read, call detection are stubbed. The incoming-call overlay is a dev-only simulated state.
- 2026-09-02 — Live Urdu mirroring uses explicit `useDir()` helpers; `I18nManager.forceRTL` is deferred (needs restart).
