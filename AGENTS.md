# Design tooling for this application

This workspace contains an Expo/React Native application in `apps/mobile` and a
separate Next.js exam-preparation website in `apps/web`. Follow each app's local
instructions. Shared brand values live in `packages/design-tokens`.

## Choose the relevant design skill

- `shadcn`: web components in `apps/web` only. Use the official registry and the
  installed CLI (`pnpm --filter web exec shadcn ...`). Read `components.json`
  before adding components. Add only components required by the current task.
- `design-taste-frontend`: marketing pages and landing-page redesigns. The local
  preset is design variance 3, motion intensity 2, visual density 4. Existing
  Inter/Playfair typography and cream/ink/gold branding take precedence over
  upstream aesthetic defaults unless the user requests a rebrand.
- `refactoring-ui`: hierarchy, spacing, type, and visual polish. Reuse shared
  tokens and existing components; translate web examples into native primitives
  when working on mobile.
- `ux-heuristics`: usability reviews of sign-in, test selection, exam navigation,
  answer saving, submission, and results. A requested review is read-only unless
  the user also asks for fixes.
- `design-audit`: the existing comprehensive visual/accessibility review workflow.
  Use the narrower skills above when their specific review is requested.

## App-specific constraints

Preserve English/Telugu content and text scaling, offline behavior, exam timing,
answer persistence, and submission semantics during visual work. Use existing
touch-size tokens, visible focus, labeled controls, and reduced-motion support.
Keep meaningful question numbers and answer-state labels. Do not import DOM,
Radix, Recharts, or shadcn web components into React Native screens.

The web app uses Tailwind 4; mobile keeps NativeWind with Tailwind 3. The web
theme maps shadcn roles to shared tokens in `apps/web/lib/theme.ts`. Do not apply
an upstream preset over the brand as part of routine component installation.

RemoCN and OpenScreen are optional demo-video tools, not application UI
dependencies. Monocharts is not configured. See `docs/DESIGN_TOOLING.md` for
selection rationale, sources, and verification commands.
