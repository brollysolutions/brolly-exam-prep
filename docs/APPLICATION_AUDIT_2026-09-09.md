# Application experience audit — 9 September 2026

The main priorities are reliable save feedback, clear identification of demonstration content, and keyboard navigation during an exam. The website's layout generally reflows well, but passing the existing regression tests does not cover these experience problems.

This is a UI, usability, accessibility, and user-facing reliability audit. It covers the Next.js website through local browser testing and the Expo application through source inspection and existing tests. It is not a backend security assessment, content fact-check, or certification of accessibility conformance. The findings below describe the original audit. The user subsequently authorized fixes; see [implementation and verification](APPLICATION_AUDIT_FIXES_2026-09-09.md) for the resulting changes and remaining device checks.

## Evidence and coverage

- Inspected the running Docker website at `http://localhost:3201`. Used a separate browser context for attempts, preferences, language changes, and simulated failures; the original browser's saved progress was not changed.
- Inspected Home, all four test filters, Profile, post/category preferences, all three welcome slides, Study, a topic reader, Updates, Affairs, Eligibility, previous-paper reading, the three imported exam routes, question navigation, palette, exit/resume/submit dialogs, results, and solutions. Checked the legacy login redirect and a missing route.
- The principal content screens were captured at 390px, 320px, and 1280px; English/Telugu comparisons used 320px. Exam/result/palette checks concentrated on narrow widths. No horizontal document overflow was found in the tested states. This is not a claim that every question, device, or text size was covered.
- A 200% root-font-size probe on the Tests page at 1280px also retained its layout. This was a CSS text-size probe, not a complete browser-zoom or native Dynamic Type test.
- In an ordinary browser context, SI Test 02 retained the selected answer, review mark, and exact deadline after an offline reload. Offline submission displayed a locally scored result. Study's read mark also survived reload.
- In a separate failure simulation, making `Storage.setItem` throw `QuotaExceededError` caused an answer to disappear on reload without a save warning. See F01.
- Reviewed every production mobile screen component and the shared screen, text, button, row, modal, and navigation primitives. There was no running native device preview. Native layout, TalkBack/VoiceOver behavior, hardware Back, keyboard occlusion, and large text therefore remain device verification items.
- Existing checks: web tests **18 passed**; web TypeScript and lint **passed**; mobile TypeScript **passed**; shared design-token tests **45 passed**; mobile tests **929 passed across 100 suites**, with **15 snapshots passed**. The token tests initially hit a sandbox process-spawn restriction, then passed on an approved rerun.

The design baseline is the approved white/light-gray, lemon-yellow, Plus Jakarta Sans website refresh in [WEBSITE_STYLE.md](WEBSITE_STYLE.md), and the cream/ink/gold, Inter/Playfair/Noto mobile system in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Their visual difference is intentional. Light-only theming is documented, so absence of dark mode is not a defect. Existing user decisions about the home screen and multiple test-row primary actions were preserved in this assessment.

## Phase 1 — critical findings

### F01. A failed browser save silently becomes temporary memory

**High priority; reproduced in the browser.** When browser storage is full or rejects writes, selecting an answer still appears successful. Reloading removes that answer and starts without the resume dialog. There is no alert or status explaining that persistence failed. The submission dialog nevertheless promises a saved result, and the result screen always says it is saved locally.

Reproduction: use a fresh browser context, make `Storage.prototype.setItem` throw `QuotaExceededError`, open `/tests/simocktest`, select option A, then reload. Before reload: one checked radio and no status/alert. After reload: zero checked radios, no resume dialog, and no status/alert. This simulates one specific storage failure, not a claim that all private browsers fail.

Evidence: [storage adapter](../apps/web/data/storage.ts), lines 41–50, switches to an internal `memory` map; the degraded state is not exposed to the UI. [Exam and result UI](../apps/web/components/exam.tsx), line 462 and the result's local-save message, has no corresponding save-status branch.

**Proposed behavior:** expose a persistence status and render a persistent bilingual warning when a write fails. Change unconditional “saved” wording to reflect the actual result. Preserve the current attempt in memory and explain that closing/reloading can lose it. Recovery/retry behavior requires a functional change; it is not a CSS fix. Acceptance: repeat the same failure test, verify the warning is announced and remains visible, and verify ordinary offline persistence still passes.

### F02. Previous-year titles lead to repeating demonstration questions

**High priority; reproduced in the browser and traced through source.** `/tests?kind=previous` presents “PWT 2022 — SCT PC” and “PWT 2018 — SCT PC” with “View paper” and “Start.” Neither the catalogue cards nor the reader explains that these are demonstration papers. The first 20 questions of `/paper/prev-2022` contain just **two unique question texts**, alternating repeatedly.

Evidence: [catalogue](../packages/fixtures/src/tests.ts), lines 35–36; [paper selection](../packages/fixtures/src/papers.ts), line 8; [question generator](../packages/fixtures/src/questions.ts), lines 115–125. These previous-paper IDs use `buildPaper`, which repeats the seed bank. The imported SI/Constable papers use their own supplied questions and are not implicated by this finding.

**Proposed presentation:** explicitly label these entries and their reader/attempt views “Demo practice paper — repeated sample questions,” in both languages, until verified previous-year content is supplied. Preserve access and scoring behavior. A future content replacement should be a separate task with provenance checks; do not present the current fixtures as authentic past papers.

### F03. Native Home omits the sample-data disclosure

**High priority; confirmed in source, not rendered on a device.** Mobile Home constructs an exam countdown and displays recruitment notices/current affairs directly from fixtures. Unlike the dedicated Updates and Affairs screens, Home does not render `common.sampleData`. The exam date source itself explicitly describes the date as a placeholder. A candidate can see the countdown without ever visiting a screen that discloses the sample content.

Evidence: [Home route](../apps/mobile/src/app/(tabs)/index.tsx), its `EXAM_INFO`, `latestNotices`, and `latestAffairs` inputs; [HomeView](../apps/mobile/src/features/home/HomeView.tsx), lines 274, 323, and 375; [exam fixture](../packages/fixtures/src/exam-info.ts), lines 16–22. This finding concerns provenance and disclosure; it does not assert what the current official exam date is.

**Proposed presentation:** put a visible bilingual “Sample schedule — not an official exam date” label beside the countdown, and sample labels on both news sections. Include the qualifier in `heroLabel` so it is spoken with the date.

### F04. Next changes the question but leaves keyboard focus behind

**High priority; reproduced in the browser.** Activating Next changes the question and scrolls to the page top, while `document.activeElement` remains the Next button. The following Tab reaches **Submit test**, bypassing the new answer group. There is also no focused question heading or concise question-change announcement. Keyboard and screen-reader users must navigate backward to find the newly displayed question.

Evidence: [Exam](../apps/web/components/exam.tsx), `go` at line 214 and `window.scrollTo` at line 229; the question legend at line 370 has no focus target.

**Proposed interaction:** after a successful question change, move focus to a programmatically focusable question heading/legend containing its number. Keep radio-group semantics and move forward into the answers in normal tab order. Do not announce the ticking timer or the entire page on every update. Verify Next, Previous, section navigation, and palette selection using only a keyboard.

## Phase 2 — refinement findings

### F05. Mobile-width exams separate the timer from the answering controls

**Medium priority; reproduced.** At 320 × 900, SI Test 01's first question places the first answer near y=756, Next near y=1221, and Submit near y=1306. The timer is near y=101 and scrolls away while the candidate reaches the answers. At this width, Previous and Questions occupy one line while Next wraps to another.

Evidence: [exam screenshot](../.playwright-mcp/audit-exam-320.png); [website.css](../apps/web/app/website.css), `.exam-heading`, `.question-footer`, and `.mobile-submit`; [Exam](../apps/web/components/exam.tsx), lines 324 and 413–450. Long questions themselves should retain all content.

**Proposed layout:** a compact sticky timer/header and a responsive action bar with reserved content padding. Keep question text in a normal scrollable region. At small widths, make the Previous / Questions / Next layout explicit instead of incidental flex wrapping. Preserve deadline, answer saving, section locks, and the submission confirmation.

### F06. Mobile Profile's spoken settings omit their selected values

**Medium priority; confirmed in source.** The Post row explicitly supplies only “Post” as its accessibility label, and Category supplies only “Category.” The visible trailing values are missing from the composed accessible name. A user cannot read their current selection directly from the setting row.

Evidence: [ProfileView](../apps/mobile/src/features/profile/ProfileView.tsx), lines 151 and 163; [MarkerRow](../apps/mobile/src/ui/MarkerRow.tsx), lines 191–198. Its own component contract explains that an explicit label suppresses the composed trailing text.

**Proposed properties:** replace the explicit title-only labels with `trailingLabel` containing the localized selection, allowing `MarkerRow` to compose the name, or supply the complete title-plus-value label. For unset preferences, speak “Not selected,” rather than relying on an em dash. Verify on VoiceOver and TalkBack.

### F07. Telugu secondary headings inherit Latin spacing

**Medium priority; computed styles confirmed.** The Telugu override fixes `h1` and the home hero `h2`, but ordinary `h2`/`h3` retain negative tracking and 1.25 line height. At 320px, a Telugu test title uses 22.4px text, 28px line height, and −0.784px tracking. Study headings use similarly compressed spacing. The project explicitly specifies untracked Telugu type with more vertical room.

Evidence: [brolly-theme.css](../apps/web/app/brolly-theme.css), lines 10, 15, and 155–159; [Telugu Study screenshot](../.playwright-mcp/audit-te-2-320.png).

**Proposed properties:** extend the Telugu heading rule to all `h1`, `h2`, and `h3`; change `letter-spacing` to `normal` and use a language-appropriate line height, initially 1.6. Keep `.question-text`'s existing 1.8 line height. This is a typography consistency finding; glyph clipping was not demonstrated.

### F08. Palette cells and navigation fall below the project's touch sizes

**Medium priority; measured.** At 320px, web palette cells measure approximately **40.65 × 40.65px**; primary navigation links are approximately **40.47px high**. Both are below the project's 48px normal target, and below its 44px minimum target token. This is a project-standard gap, not a claimed failure of WCAG 2.2 AA's 24px minimum. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Evidence: [palette screenshot](../.playwright-mcp/audit-palette-320.png); [website.css](../apps/web/app/website.css), lines 555–567; [brolly-theme.css](../apps/web/app/brolly-theme.css), lines 151 and 190.

**Proposed properties:** use `min-height: var(--touch-size)` on navigation and palette controls. Give palette columns a 48px minimum width and reduce the number of columns when necessary; at 320px, four columns fit more reliably than five. Retain real question numbers, current-question focus rings, and all five labeled answer states. Mobile's six-column `PaletteSheet` calculation should receive the same narrow-device measurement during R01.

### F09. Invalid measurements are described as not entered

**Medium priority; reproduced on the website, shared parsing pattern present on mobile.** Entering `abc` in Height and pressing Check leaves `abc` in the field, reports “Not entered” in the result, and never sets `aria-invalid`. The user receives no explanation of what to correct. The input's only description is the required standard.

Evidence: [eligibility UI](../apps/web/components/content-screens.tsx), lines 246–260 and 278–284; [parseMeasure](../apps/web/features/eligibility/evaluate.ts), lines 57–62, maps malformed and blank text to the same undefined result.

**Proposed feedback:** distinguish an empty field from a nonempty invalid value in the form presentation. Add a bilingual inline message such as “Enter a positive number in cm,” connect it with `aria-describedby`, set `aria-invalid`, and focus the first invalid field after checking. Preserve the evaluator's actual standards and verdict rules. This needs a validation-presentation change, not a change to eligibility thresholds.

### F10. Website onboarding copy does not match its current behavior

**Medium priority; reproduced and compared with implementation.** Welcome slide 1 describes every paper as “3 hours,” but the SI cards and timers use 190 minutes. Slide 2 tells candidates to submit when they have signal, even though offline submission worked in this audit. Post preferences say the choice changes the tests, while the catalogue still defaults to SI independently of that preference. These strings were retained from an earlier flow.

Evidence: [Welcome and Onboarding](../apps/web/components/screens.tsx), lines 196 and 315–331; `Library`'s `kind` selection in the same file; [catalogue patterns](../apps/web/lib/test-catalog.ts).

**Proposed copy:** describe timing as paper-specific, explain that downloaded/available tests can submit offline with local storage, and state exactly where the optional post preference is used. Update both languages using website-specific copy where mobile behavior differs. Do not silently change filters, timing, or onboarding to make them fit the old wording.

## Phase 3 — polish opportunities

| Area | Evidence | Concrete proposal |
| --- | --- | --- |
| Study scanning | Each short title/minutes pair sits in a large card with a decorative yellow bar. [Study](../apps/web/components/content-screens.tsx), line 31; [theme](../apps/web/app/brolly-theme.css), line 118. | Scope a compact topic-row variant to `.topic-grid`: reduce padding from 24/28px to 16px and remove its heading `::before` bar. Keep full titles, read marks, and generous targets. Do not compact long reading content. |
| Statistic alignment | Home/result numbers sit at different vertical positions when their labels wrap. [stats styles](../apps/web/app/website.css), line 199; [result screenshot](../.playwright-mcp/audit-result-320.png). | Align label rows and value rows using a shared grid/subgrid arrangement. Let labels grow with Telugu and text size instead of fixing their height. |
| Empty history | Profile shows only “Nothing yet.” [Profile](../apps/web/components/screens.tsx), line 307. | Add “Complete a test to see it here” and a quiet “Browse tests” link. |
| Reminder control | Profile offers an enabled “Daily reminder” checkbox, followed by a note that notifications are not scheduled. [Profile](../apps/web/components/screens.tsx), lines 276–285. | Replace the inactive feature's editable control with a clear availability note, or label it explicitly as a future preference. Do not imply that toggling it schedules a reminder. Adding actual notifications is a separate feature decision. |
| Loading wording | The previous-paper loader displays “Nothing yet” while its array is empty. [Paper](../apps/web/components/content-screens.tsx), line 345. | Replace the loading branch's empty-state wording with a bilingual “Loading paper…” status. Keep true empty and failed states separate. |

## Native checks required before approving accessibility fixes

These are source-supported risks, not device-reproduced failures.

**R01 — Large text and constrained controls.** [Button](../apps/mobile/src/ui/Button.tsx), line 128, fixes height to 48/56; the label has no shrink/wrap allocation beside an icon. Attempt actions also have fixed widths/heights, and the tab bar uses fixed language-specific heights. [Dialog](../apps/mobile/src/ui/Dialog.tsx), line 89, is bottom-aligned with no scrolling content or maximum-height strategy. Test at default and 200% text, in both languages, on a small phone and in landscape. Check the login keypad, submit/exit dialogs, attempt footer, tabs, category cards, and palette. Proposed starting changes are `height` → `minHeight` plus vertical padding, shrinkable/wrapping button labels, adaptive palette columns, and a constrained scrollable dialog body. Measure before committing final dimensions. The analogous web requirement is text enlargement without losing content or controls. [W3C resize-text guidance](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html).

**R02 — Native dialog isolation and Back behavior.** The custom Dialog is an `Animated.View`, not an RN `Modal`; it sets `accessibilityViewIsModal`, but `Screen` leaves the background tree present. That property is documented for iOS; Android uses `importantForAccessibility` for background suppression. There is no shared focus entry/return behavior. Attempt installs a BackHandler, whereas Profile's confirmations do not have their own handler. Test whether TalkBack can reach background controls and whether Back dismisses the confirmation predictably. A shared modal contract should provide focus entry/return, background isolation, and cancellation while keeping submit/auto-submit semantics. [React Native accessibility documentation](https://reactnative.dev/docs/accessibility).

## Screen scorecards

`P` = pass in the inspected evidence; `W` = needs work; `F` = a demonstrated failure in that dimension; `?` = not verified; `–` = not applicable. These are qualitative screen assessments, not accessibility certification. A `P` in visual color review does not mean every rendered color pair was instrumentally tested. All 45 automated shared-token checks passed, but those tests do not cover every website override.

Dimensions: H hierarchy; S spacing; T typography; C color; G grid/alignment; Co components; I icons/targets; M motion; E empty; L loading; Er error/recovery; Th theming; D density; R responsiveness; A accessibility.

| Website screen/state | H | S | T | C | G | Co | I | M | E | L | Er | Th | D | R | A |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home | P | P | W | P | W | P | W | P | P | ? | F | P | P | P | W |
| Tests — SI / PC / full | P | P | W | P | P | P | W | P | ? | ? | F | P | P | P | W |
| Tests — previous year | W | P | W | P | P | P | W | P | ? | ? | F | P | P | P | W |
| Welcome 1 | W | P | P | P | P | P | W | P | – | ? | – | P | P | P | W |
| Welcome 2 | W | P | P | P | P | P | W | P | – | ? | F | P | P | P | W |
| Welcome 3 | P | P | P | P | P | P | W | P | – | ? | – | P | P | P | W |
| Post preference | W | P | P | P | P | P | W | P | – | ? | ? | P | P | P | W |
| Category preference | P | P | P | P | P | P | W | P | – | ? | ? | P | P | P | W |
| Profile / empty history | W | P | W | P | P | P | W | P | W | ? | F | P | P | P | W |
| Study catalogue | P | W | W | P | P | W | W | P | – | ? | ? | P | W | P | W |
| Topic reader / read state | P | P | W | P | P | P | W | P | ? | ? | F | P | P | P | W |
| Updates | P | P | W | P | P | P | W | P | – | ? | – | P | P | P | W |
| Affairs / category filters | P | P | W | P | P | P | W | P | ? | ? | – | P | P | P | W |
| Eligibility / invalid value | P | P | W | P | W | P | W | P | P | ? | F | P | P | P | W |
| Previous-paper reader | W | P | W | P | P | P | W | P | ? | W | W | P | P | P | W |
| Imported exam templates | W | W | P | P | W | P | W | P | – | W | F | P | W | W | F |
| Question palette | P | P | P | P | P | P | W | P | – | – | – | P | W | W | W |
| Submit / exit / resume | P | P | W | P | W | P | P | P | – | – | F | P | P | P | P |
| Result / solutions | P | P | W | P | W | P | W | P | ? | W | F | P | P | P | W |
| Missing route | P | P | P | P | P | P | P | P | P | – | P | P | P | P | P |

Error/recovery failures across persistent screens refer to the shared, reproduced storage-status gap in F01; they do not indicate that each screen failed an independent network test. Global navigation target findings apply to all screens using that header. Generic pending/loading states were not artificially delayed for every route.

For mobile, assigning visual pass grades without a device would be misleading. The following records all 15 dimensions using compact groups, with provisional source-only assessments clearly marked. `P*` means an appropriate implementation was found in source, not a rendered pass. Group order is **H/S/T/C/G**, **Co/I/M**, **E/L/Er**, **Th/D/R/A**.

| Mobile screen | H/S/T/C/G | Co/I/M | E/L/Er | Th/D/R/A | Specific evidence or limit |
| --- | --- | --- | --- | --- | --- |
| Welcome 1–3 | ?/?/?/P*/? | P*/?/P* | –/–/– | P*/?/?/? | Pager and reduced-motion branch; R01 |
| Phone login | ?/?/?/P*/? | P*/?/P* | –/W/P* | P*/?/?/? | Busy disables Continue without visible progress wording; custom keypad needs device testing |
| Post | ?/?/?/P*/? | P*/?/P* | –/–/– | P*/?/?/? | Selected cards expose radio state; R01 |
| Category | ?/?/?/P*/? | P*/?/P* | –/–/– | P*/?/?/? | Two-column cards and fixed footer; R01 |
| Home | W/?/?/P*/? | P*/?/P* | P*/–/? | P*/?/?/? | F03: sample content not identified here |
| Tests / previous filters | W/?/?/P*/? | P*/?/P* | P*/–/P* | P*/?/?/? | F02, row reuse, empty/locked messages |
| Study | ?/?/?/P*/? | P*/?/P* | –/–/– | P*/?/?/? | Read-state labels composed with title and duration |
| Topic | ?/?/?/P*/? | P*/?/P* | P*/–/P* | P*/?/?/? | Not-found action; readable body and callout components |
| Updates | ?/?/?/P*/? | P*/?/P* | P*/–/– | P*/?/?/? | Sample badge, expanded state, reduced-motion branch |
| Affairs | ?/?/?/P*/? | P*/?/P* | P*/–/– | P*/?/?/? | Sample badge and explicit empty state |
| Eligibility | ?/?/?/P*/? | P*/?/P* | –/–/W | P*/?/?/? | Source shares invalid/blank parsing behavior; R01 |
| Profile | ?/?/?/P*/? | P*/?/P* | P*/–/? | P*/?/?/F | F06; R02 for confirmations |
| Previous-paper reader | W/?/?/P*/? | P*/?/P* | ?/P*/P* | P*/?/?/? | F02; skeleton/retry branches and virtualized content |
| Attempt | ?/?/?/P*/? | P*/?/P* | –/P*/P* | P*/?/?/? | Pinned action bar; R01 and R02 |
| Palette | ?/?/?/P*/? | P*/?/P* | –/–/– | P*/?/?/? | Number/state labels; measure calculated cell widths |
| Attempt/profile dialogs | ?/?/?/P*/? | P*/?/P* | –/–/? | P*/?/?/? | R01 and R02 |
| Result | ?/?/?/P*/? | P*/?/P* | ?/P*/P* | P*/?/?/? | Score, skeleton/retry, and action compositions |
| Solutions | ?/?/?/P*/? | P*/?/P* | P*/P*/P* | P*/?/?/? | Filter counts, explanatory text, empty/skeleton/retry |

Redirect-only routes have no separate UI to grade. The development states gallery was inspected through its tests; it is not a production user journey.

## Design-system and implementation notes

1. Keep the website and mobile themes separate. Reuse shared semantic success/error colors, language rules, and 48/56px touch tokens; do not apply a new preset.
2. Establish a shared save-status presentation contract for all persistent web screens. The storage adapter must expose whether “saved” is true before UI copy can promise it.
3. Make provenance visible alongside sample dates, news, and demo papers. Preserve authentic imported paper content and all exam state labels.
4. Give web exams an explicit focus transition and a mobile action-bar composition. Keep data changes and deadline checks in existing handlers.
5. Add a compact web topic variant and language-wide heading rules; change only the selectors associated with those roles.
6. Define native Dialog focus, cancellation, accessible-background, scrolling, and large-text requirements before changing individual callers. Use native primitives; do not import web/Radix/shadcn components into mobile.

The skill's remove/elevate filter was applied to avoid broad visual churn. F01/F04/F05/F06/F08/F09 serve essential candidate tasks (0–2 removal signals, at least 3 elevation signals): retain and improve them. F02/F03/F10 contain useful concepts but misleading presentation (at least 3 signals in both groups): redesign their labeling. F07 is a language-system correction. The topic-card bars and nonfunctional reminder affordance have at least 3 removal signals and no unique current task benefit; removal is proposed only for those specific presentations. Statistics, empty history, and loading feedback remain, with clearer composition and wording.

These were the audit's proposals. The authorized implementation is recorded separately so the original observations remain distinguishable from the final behavior. Persistence status, focus management, modal behavior, and validation feedback require behavioral verification. Bilingual content, text scaling, offline behavior, timing, answer persistence, review gates, and submission semantics remain protected requirements.

## Verification completion

All invoked checks completed successfully: **992 tests in total** across web, mobile, and shared tokens, plus both application TypeScript checks and web lint. The mobile suite completed in 131.48 seconds. These results complement the browser/source findings; they do not replace native assistive-technology and large-text testing.

Temporary audit browser contexts were closed. The local application stack was left running. The only new tracked-workspace artifact is this report; screenshots remain under the ignored `.playwright-mcp` directory. Local evidence links were checked and `git diff --check` passed.

Screenshots are local audit artifacts under `.playwright-mcp/audit-*.png`. Numbered screenshots are capture-run identifiers, not a single route numbering scheme. The descriptive exam, palette, result, offline, and storage-failure filenames identify their state directly. This report links the relevant evidence at each finding.
