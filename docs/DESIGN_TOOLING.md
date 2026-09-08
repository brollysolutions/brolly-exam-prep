# Application design tooling

Configured on 2026-09-08 for the Expo mobile application and separate Next.js website.

## Selection

| Tool | Decision and application fit |
| --- | --- |
| [shadcn/ui](https://ui.shadcn.com/docs) | Installed the official agent skill and CLI, Tailwind 4/PostCSS foundation, semantic theme, aliases, utility, and Button in `apps/web`. Use for website components. |
| [Taste](https://github.com/Leonxlnx/taste-skill) | Installed core `design-taste-frontend`, upstream v2 experimental, at a pinned revision. Configured for restrained marketing-page design, preserving existing branding. The separate GSAP-heavy `gpt-taste` variant was not selected. |
| [Refactoring UI skill](https://github.com/wondelai/skills/tree/main/plugins/ux-design/skills/refactoring-ui) | Installed the community skill for visual hierarchy, spacing, and polish. This is not the official paid Refactoring UI book/product and does not include a purchase or license to it. |
| [UX Heuristics skill](https://github.com/wondelai/skills/tree/main/plugins/ux-design/skills/ux-heuristics) | Installed for usability evaluation of sign-in, exam flows, offline feedback, and results. It complements the existing design-audit skill. |
| [RemoCN](https://github.com/Remocn/remocn) | Deferred. Remotion video components belong in a dedicated video project when a demo is needed; they are not React Native UI components. |
| [Monocharts](https://github.com/Subhan-code/Monocharts) | Not installed. The matching repository's README currently describes the Amicro animation package and points to another repository. Confirm the intended project before choosing a chart dependency. For a future web dashboard, evaluate shadcn Chart/Recharts against actual data needs. |
| [OpenScreen](https://github.com/getopenscreen/openscreen) | Deferred. A desktop screen recorder/editor for product demos, independent of app UI. The original project was archived and its README identifies this continuation. No recorder was installed or started. |

## Where the setup lives

- `.agents/skills/{shadcn,design-taste-frontend,refactoring-ui,ux-heuristics}`:
  project-local Codex skills, including upstream references and local context.
- `AGENTS.md`: skill routing and mobile/web constraints.
- `docs/design-skills.sources.json`: exact upstream commits, original and adapted
  entrypoint hashes. This is separate from `skills-lock.json`, which tracks the
  pre-existing skills installed with a different installer.
- `apps/web/components.json`: official shadcn registry, Radix/new-york components,
  Lucide icon preference, React Server Components and TypeScript configuration.
- `apps/web/lib/theme.ts`: shadcn roles mapped directly to shared Brolly tokens.
- `apps/web/app/globals.css` and `postcss.config.mjs`: web-only Tailwind 4 wiring.

Mobile remains on NativeWind/Tailwind 3. The shared Tailwind 3 preset is not
loaded into the web Tailwind 4 build. Brand values still have one source in
`packages/design-tokens`. The website currently has a light theme only; this
setup does not introduce a dark theme or download new fonts. Chart colors are
prepared but no chart package or sample chart has been added.

The Next.js website now uses the real Button component across sign-in, test,
study, profile, and results screens. Default and large button sizes use the
shared 48/56-pixel touch targets. See `docs/WEB_MIGRATION.md` for the website
migration and deployment details.

## Use

The new skills should be available on the next Codex turn. Example prompts:

- `Use $ux-heuristics to review the exam submission flow.`
- `Use $refactoring-ui to improve spacing on the Tests screen using our tokens.`
- `Use $design-taste-frontend to refine the website landing page.`
- `Use $shadcn to add an accessible dialog in apps/web.`

From the repository root:

```powershell
pnpm --filter web exec shadcn info --json
pnpm --filter web exec shadcn docs dialog
pnpm --filter web exec shadcn add @shadcn/dialog
pnpm --filter web typecheck
pnpm --filter web build
pnpm --filter @tslprb/design-tokens test
pnpm --filter web dev --port 3202
```

The separate website uses port 3202 in the example to avoid the existing Docker
app on 3201. Install dependencies from the committed lockfile with
`pnpm install --frozen-lockfile` on another machine. A normal host terminal may
be necessary if a restricted Codex shell cannot resolve pnpm's Windows shims.

## Updating skills

Review upstream changes against the pinned commits before updating. Preserve
each entrypoint's `Local application configuration`, Codex-compatible frontmatter,
explicit CLI context loading, and supporting references. Update source hashes
after reviewed changes. Do not blindly replace these local adaptations with an
entire upstream bundle.

The skills were installed with Codex's Skill Installer and validated with Skill
Creator's `quick_validate.py`. This checks structure and metadata, not the quality
of a future generated design or full usability/accessibility conformance.

## Initial tooling verification (before the website migration)

- All four adapted skill entrypoints passed validation; upstream licenses are
  retained beside them.
- `shadcn info --json` recognized Next.js, Tailwind 4, the Radix base, aliases,
  and the installed Button.
- Website TypeScript check and production build passed.
- All 45 existing design-token tests passed.
- Playwright checked the production page at 390px and 1280px widths: no
  horizontal overflow, the shared cream background and ink button colors were
  applied, and the coming-soon button was disabled and 56px tall.
- The browser reported an existing missing `/favicon.ico` (404); no other
  console errors were reported during these checks.
- Lockfile importer entries for mobile and every shared package are unchanged.
  Only the website importer changed. `git diff --check` passed.

The temporary preview server and browser were stopped after verification.
