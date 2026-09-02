# Feature tracking

Status ∈ `todo` · `in-progress` · `review` · `done` · `parked`. One row per feature ID; one feature ID per PR. Rows are updated by `@pr-tracker` and the `track-pr` hook.

| ID | Feature | Screens / route | Status | PR | Agent | Notes |
|---|---|---|---|---|---|---|
| F-00 | Workflow, tooling, monorepo scaffold | repo root, `.claude/`, `docs/` | done | c823868, b5c0fff, d7bf982 (main) | controller | plugins, skills, MCPs, hooks, agents, CI |
| F-01 | Design system: tokens, fonts, primitives, RTL layer, dev states screen | `packages/design-tokens`, `packages/i18n`, `apps/mobile/src/ui`, `src/app/dev/states` | review | branch `feat/F-01-design-system` (stacked on F-17; PR after repo creation) | ui-builder | 20 primitives, 34 tests, ur snapshot; reviewed (opus) + fix round clean |
| F-02 | Splash + onboarding intro (3 slides) | `src/app/(onboarding)/welcome` | todo | - | ui-builder | not in prototype |
| F-03 | Phone login | `src/app/(auth)/login` | todo | - | ui-builder | custom keypad, +91 |
| F-04 | OTP verification | `src/app/(auth)/otp` | todo | - | ui-builder | 6 cells, 24 s resend |
| F-05 | Post selection (Constable / SI-ASI) | `src/app/(onboarding)/post` | todo | - | ui-builder | step 1/2 |
| F-06 | Category selection | `src/app/(onboarding)/category` | todo | - | ui-builder | step 2/2, PWT qualifying % |
| F-07 | Home dashboard | `src/app/(tabs)/index` | todo | - | ui-builder | not in prototype |
| F-08 | Test library | `src/app/(tabs)/tests` | todo | - | ui-builder | not in prototype |
| F-09 | Test attempt core | `src/app/test/[id]/index` | todo | - | ui-builder | header, sections, question, options, footer, deadline timer |
| F-10 | Question palette sheet | `src/app/test/[id]/index` | todo | - | ui-builder | legend, grid, 5 states, locked section, submit |
| F-11 | Test dialogs, toasts, banners, call overlay | `src/app/test/[id]/index` | todo | - | ui-builder | 14 states |
| F-12 | Result & analysis | `src/app/test/[id]/result` | todo | - | ui-builder | score, cut-off, 3 sections |
| F-13 | Answers & explanation | `src/app/test/[id]/solutions` | todo | - | ui-builder | wrong/all filter |
| F-14 | Profile & settings | `src/app/(tabs)/profile` | todo | - | ui-builder | not in prototype |
| F-15 | Exam pattern config + fixtures | `packages/fixtures` | done | c823868 (main) | controller | official PWT pattern (SI split unverified); 6-question seed bank |
| F-16 | Persistence + mock API adapter | `apps/mobile/src/data` | todo | - | ui-builder | zustand + expo-sqlite kv; `EXPO_PUBLIC_API=mock` |
| F-17 | API scaffold: FastAPI, Postgres 17, Redis, arq scheduler, Docker Compose | `services/api`, `docker-compose.yml` | review | branch `feat/F-17-api-scaffold` (PR after repo creation) | backend-scaffolder | stubs return fixtures; 12/12 pytest; docker stack verified; `.env.example` needs manual CORS_ORIGINS edit |
| F-18 | Next.js placeholder site | `apps/web` | done | c823868 (main) | controller | landing only |
