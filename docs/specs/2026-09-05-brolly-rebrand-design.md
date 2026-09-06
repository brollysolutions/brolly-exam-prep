# Brolly rebrand — full UI/UX redesign of the TSLPRB app (F-28 … F-30)

## Context
The app was built to the approved prototype's "hi-vis yellow on tar" identity. The company (Brolly Solutions, https://brollysolutions.in) has a very different brand: cream surfaces, charcoal ink, restrained gold, Inter + Playfair Display, soft radii and warm shadows. The user wants the app to read as one product with the website and asked for a **full UI/UX redesign** around the logo. Decisions taken with the user (2026-09-05):

| Decision | Choice |
|---|---|
| Theme | Light, like the website (tokens shaped so a dark palette can be added later) |
| Brand source | Live site CSS/fonts (extracted below), logo PNG/SVG from the site |
| Scope | Full redesign, delivered in phases (each phase shippable) |
| Identity in-app | Brolly logo in the header and splash; "TSLPRB"/"PWT" stay in copy as the exam name |
| Primary buttons | Solid ink `#211c17` with cream text; gold marks active/selected/progress/badges |
| Fonts | Inter for text; Playfair Display for screen titles and hero lines; Noto Sans Telugu for te; numbers in Inter (tabular) |
| Brand mark | Umbrella glyph + "Brolly Solutions" in the header, full logo on splash/welcome; the navy/gold "B" tile only as the phone app icon |
| Palette colours | Brand semantics: gold = answered, ink = marked, red outline = unanswered, plain = unvisited |
| Delivery | Phases A → B → C → D → E run back to back, each reviewed and pushed on its own |

## Brand kit (from brollysolutions.in, Tailwind v4 theme)
- Fonts: `Inter` 400/500/600/700/800 (`--font-sans`, `--font-heading`), `Playfair Display` regular + italic (wordmark), `DM Mono` 400/500 (site code only — not used in the app).
- Colours: cream `#f7f2e6`, cream-deep `#f0e9d8`, surface `#faf6ec`, line `#e9e2d3`; ink-900 `#211c17`, ink-700 `#4a423a`, ink-500 `#6f665b`, navy-700 `#3d352c`; gold 300 `#e8cf7a`, 400 `#d4b04a`, **500 `#c29b38` (brand gold)**, 600 `#a17f2a`, 700 `#856a22`; green `#22c55e`, red `#f87171`.
- Shape: radii 6 / 8 / 12 px; shadows are ink-900 at 15–45 % alpha (`0 8px 32px -16px #211c1733`, `0 6px 20px #211c172e`), gold glow `0 6px 20px #c29b3847` on the CTA.
- Pattern: pill badge with a gold dot + tracked uppercase label ("● DIGITAL TRANSFORMATION PARTNER"); gold underline on the active nav item; heavy Inter headline on cream.
- Assets (downloaded to the session scratchpad, to be copied into `apps/mobile/assets/brand/`): `logo_black.png` 552×452 (umbrella + "Brolly" + italic "Solutions", black), `logo.png` (yellow variant), `favicon.svg` (navy `#0a1e3a` rounded square, gold "B").
- Contrast facts: gold 500 on cream is ~2.6:1 → gold is for fills/markers only; gold **text** uses 700 `#856a22` (≈5:1 on cream). Ink-900 on cream ≈ 14:1; ink-500 `#6f665b` on cream ≈ 5.2:1 (captions OK); anything lighter is decorative.

## Where the current identity lives (from the codebase map)
- Single token source `packages/design-tokens/tokens.json` (34 colours, radii 2–6, `font.en/te`, 21 type roles, tracking, motion, hazard) → `src/index.ts` (`typography()`, `paletteState` hard-codes hivis/hazard) → `tailwind.preset.cjs`.
- Fonts: `apps/mobile/src/app/_layout.tsx:3-52` (`FONTS` map + `useFonts`), packages `@expo-google-fonts/archivo`, `noto-sans-telugu`.
- ~13 primitives whose variant names are colour names: `Button` (`primary` = `bg-hivis`, `hazard`, `danger`), `Chip` tones, `SegmentedChips` `hivis|quiet`, `Dialog` tones, `Toast`, `Card` selected state, `ProgressRail`, `PaletteCell` (`paletteState`), `Toggle`, `OtpCells`/`PhoneField` focus, `Sheet` top border, `Kicker` defaults, `HazardRail`, `Screen` `bg-tar`; tab bar colours in `src/app/(tabs)/_layout.tsx:48-53`.
- Brand lockups: `HomeView.tsx:281`, `LoginView.tsx:63`, `WelcomeView.tsx:13-27` (`BrandBlock` plate), `StatesView.tsx:168`; `common.brand` = "TSLPRB".
- `app.json`: `userInterfaceStyle: dark`, three `#0D0D0E` literals (adaptive icon, splash, root background); `_layout.tsx:65` `StatusBar style="light"`; `scripts/make-splash-icon.mjs` draws the old plate.
- No theming layer, zero raw hex in `src`; `apps/web` inlines token colours with three magic numbers.
- Tests: 16 snapshots (hexes serialised, `#FFE01B` ×16), 20 tests asserting `colors.X`/class names symbolically (survive a retokenise, break on renames), `Text.test.tsx` and `EligibilityView.test.tsx` assert the "TSLPRB" string.

## Contrast rules (computed WCAG, govern every choice below)
| pair | ratio | use |
|---|---|---|
| ink-900 / ink-700 / ink-500 on cream | 15.1 / 8.8 / 5.0 | text (ink-500 = captions, kickers, inactive tab) |
| gold-500 `#c29b38` on cream | 2.3 | **fills only** (carries ink text, 6.5:1) |
| gold-600 `#a17f2a` on cream | 3.4 | non-text: progress fill, rings, 3 px rules, start edges |
| gold-700 `#856a22` on cream / surface | 4.6 / 4.8 | **gold text**: kickers, active tab, links, stat numbers |
| cream on ink-900 | 15.1 | primary button |
| red text `#b91c1c`, green text `#166534` on cream | 5.8 / 6.4 | danger / ok text; `#f87171` / `#22c55e` are fills only |

## Phase A — Foundation (F-28): tokens, fonts, primitives, chrome, brand
Owner: ui-builder in the main checkout. Six commits, each green on `pnpm typecheck && pnpm lint && pnpm test`.

**A1 Tokens** (`packages/design-tokens/tokens.json`, `src/index.ts`, `tailwind.preset.cjs`, `apps/mobile/tailwind.config.js:5`)
- New semantic `colors`: `canvas #f7f2e6`, `surface #faf6ec`, `surface2 #f0e9d8`, `line #e9e2d3`, `line2 #ccc7bd`, `ink #211c17`, `ink2 #4a423a`, `ink3 #6f665b`, `ink4 #989085` (decorative only), `onInk #f7f2e6`, `accent #c29b38`, `accentSoft #e8cf7a`, `accentStrong #a17f2a`, `accentInk #856a22`, `accentTint rgba(194,155,56,.14)`, `ok #22c55e`, `okInk #166534`, `danger #f87171`, `dangerInk #b91c1c`, `dangerTint`, `navy #0a1e3a`, `white`, `scrim`, `scrimHeavy`, `pressTint rgba(33,28,23,.10)`, `pressTintOnDark`. Raw scale kept in a `palette` block (tests only).
- `legacyColors` block: every old name aliased to a brand value so the 69 screen files keep compiling — `tar→canvas`, `panel/panel2→surface`, `panel3/panel4→surface2`, ~~`line2→line`~~ (as built: `line2` keeps its semantic value, the strong outline; its legacy divider sites are re-styled to `line` — six in fix wave 1, the rest in B/C/D), `line3→line2`, `chalk→ink`, `chalk2→ink2`, `dim/steel→ink3`, `mute/ghost→ink4`, `hivis/hazard/sand→#856a22` (dark gold, AA as text and as a fill under `text-tar`), `flag→#b91c1c`, `success→okInk`, `hivisTint*→accentTint`, `flagTint→dangerTint`, `offline*→surface2/line/ink2`. Old `ink` (a background) is the one name that cannot alias: fix `_layout.tsx:62` (→ `canvas`) and `AttemptOverlays.tsx:182` (dark call overlay keeps `bg-ink`, its text → `onInk`).
- Radii keep names, new values `xs 4 / sm 6 / md 8 / lg 12 / xl 16`; `shadow` block (`card`, `raised`, `sheet` as `boxShadow` strings, RN 0.86 supports them) + `shadowStyle()` helper; `size.rail 5→3`; drop `hazard` block and `motion.marquee`, add `motion.pulse 700`.
- `app.json`: `userInterfaceStyle: "light"`, root background `#f7f2e6`; `_layout.tsx:65` `StatusBar style="dark"`, `contentStyle` canvas. `apps/web` layout/page: canvas/ink, Inter, 3 px accent rule instead of the hazard gradient.
- New `packages/design-tokens/test/contrast.test.mjs` (node `--test`, wired via a `test` script so root `pnpm test` runs it): asserts the table above plus "every colour equals a palette value". New `test/legacy.test.mjs`: fails if `apps/mobile/src/ui/**` uses a legacy name (scan root flips to all of `src` in Phase D).
- Docs: `CLAUDE.md:5` identity line, `.claude/rules/mobile-ui.md` hazard/hi-vis lines.

**A2 Fonts** (`apps/mobile/package.json`, `_layout.tsx:3-52`, tokens `font`/`face`/`text`/`tracking`, `index.ts` `typography()`, `ui/Text.tsx`, `packages/i18n/src/direction.ts:55`)
- Add `@expo-google-fonts/inter` (400–800) and `@expo-google-fonts/playfair-display` (400 + 400 italic); remove `archivo`. Telugu gains `NotoSansTelugu_800ExtraBold`.
- `font.en.display = PlayfairDisplay` (all weights → Regular, italic map, lineHeight 1.2); `face` map routes `display`, `titleLg`, `title`, new `wordmark` (17) roles to the display face in en; te keeps Noto 700 for titles. `typography(lang, role, weight, italic)`; `Text` gains `italic`. Sizes: title 24, titleLg 26, display 30; tracking kicker 1.2, display −0.3, brand 2. en line-height 1.5, te 1.65 unchanged.
- `<Num>` keeps aligning: `Text.tsx:81` already sets `fontVariant: ['tabular-nums']` and Inter ships `tnum`; DM Mono not adopted (escape hatch: add `"mono"` to the `face` map). Verify the attempt timer crossing 9:59→10:00 in Expo Go.
- Tests: `Archivo_`→`Inter_` in 7 ui + 8 feature tests; `typography.test.ts` gains display/italic/800 cases; all 16 snapshots refreshed (fontFamily only). `.claude/rules/i18n-rtl.md:11` font line.

**A3 Primitives on semantic tokens** (`apps/mobile/src/ui/*`, tests, dev gallery)
- `Text` default colour `ink`. `Button`: `primary bg-ink/onInk`, `secondary border-line2/ink`, `ghost ink2`, `danger border-dangerInk` (no solid red; `dangerOutline` kept as alias one cycle), `accent border-accentStrong` (was `hazard`; active `bg-accent` + ink), disabled `surface2/ink4`, ripples `pressTintOnDark` on ink, `accentTint` elsewhere. `Card`: `rounded-md border-line bg-surface` + `shadow.card` (`flat` prop to drop), selected `border-2 border-accent bg-accentTint`, title stays ink. `Chip` tones → `accent | danger | ok | label` (old names mapped): `accent bg-accentSoft border-accent`, label `bg-surface2 text-ink3`. `SegmentedChips` `accent | quiet` (selected `bg-accentSoft` / `bg-surface2`, label ink, inactive ink3). `Kicker` defaults `ink3`, index `accentInk`. `Screen bg-canvas`. `Keypad/OtpCells/PhoneField`: surface fills, `line2` idle, `accentStrong` focus, placeholder ink3.
- `HazardRail → Rail`: 3 px solid rule, `tone accent | danger` (`bg-accentStrong` / `bg-dangerInk`), `critical` = opacity pulse (Reanimated, reduced-motion safe); attempt screen props unchanged; `HazardRail` name re-exported until Phase D. `ProgressRail` track `surface2`, fill `accentStrong`, `rounded-full`. `paletteState`: unvisited `surface2/ink3/line2`, not-answered outline `dangerInk`, answered `ink/onInk`, marked `accent/ink`, current ring `border-ink` with a 2 px canvas gap, dot `ink/surface`. `Toggle` fully round: on `accent` track + ink thumb, off `surface2/line2/ink3`. `Banner surface2/line/ink2 + accentInk glyph`; `Toast accent | danger` with ink text, `rounded-md mx-4` + `shadow.raised`; `Dialog` `rounded-lg border-line border-t-[3px] border-t-accentStrong bg-surface` + `shadow.sheet`, tiles `surface2`; `Sheet` surface, `radius.xl` top corners, 3 px `accentStrong` top edge, `line2` grabber.
- Tab bar (`(tabs)/_layout.tsx:46-78`): scene canvas, bar `surface` with `line` top border, active `accentInk`, inactive `ink3`, ripple `accentTint`; keep the JS `Tabs`.
- Tests updated where they assert primitive output (Button/Card/Chip/Kicker/PaletteCell/SegmentedChips/Text/Toggle/tabsLayout + Home/Library/Eligibility/Profile/Topic lines that assert `bg-hivis`/`bg-panel3` on primitives); `Rail.test.tsx` replaces `HazardRail.test.tsx`; dev gallery lists new variants.

**A4 Brand lockup and header sites** (user decision: the **umbrella** is the in-app mark; the navy/gold "B" tile is the phone app icon only)
- `src/ui/Brand.tsx`: `variant="lockup"` (header, default 28 px tall) = the umbrella glyph + live text "Brolly" (Playfair `wordmark`) and "Solutions" (Playfair italic, smaller), `accessibilityRole="header"`, label "Brolly Solutions". The umbrella comes from `assets/brand/umbrella.png`, cropped from the top third of `logo_black.png` (transparent, ~552×170) and shown with `expo-image` at 28 px (`tintColor` ink); tracing it to an SVG path (`react-native-svg`, in Expo Go 57) is a listed follow-up that swaps only this file. `variant="splash"` = `expo-image` of the full `brolly-logo.png` for Welcome and the splash. Live text rather than the full PNG in the header because the lockup is near-square and the name would be ~6 px at header height. `BrandMark` (the "B" tile SVG) exists only for the icon-generation script and the dev gallery.
- Replace the three "TSLPRB" lockups: `HomeView.tsx:281`, `LoginView.tsx:63`, `WelcomeView.tsx:13-27` (`BrandBlock` plate), `StatesView.tsx:168`; `common.brand` → "Brolly Solutions" in en + te (Latin, like "PWT"). `Brand.test.tsx`; Home/Login/Welcome snapshots.

**A5 Splash, icons, docs**
- `assets/brand/`: `brolly-logo.png`, `brolly-mark.svg`, `splash-logo.png`; `app.json` splash `backgroundColor #f7f2e6`, `image` = logo, `imageWidth 200`; adaptive icon background `#0a1e3a` with the mark as foreground/monochrome, `icon.png` 1024 rendered from the favicon SVG (one-off script with `@resvg/resvg-js`; if that is not feasible in-session the old icon files stay and the icon set is a listed follow-up). Delete `scripts/make-splash-icon.mjs` and the unused template images. `pnpm doctor` green.
- `docs/DESIGN_SYSTEM.md` full rewrite ("Brolly on cream": identity, token table with ratios, type table, shape, components, motion, platform), `docs/FEATURES.md` F-28 row, `docs/IMPLEMENTATION_PLAN.md` Phase 4 line + dated ruling, spec addendum.

**A6 additions the screen phases depend on** (land in A3/A4): `Card` gets a `trailing` slot and a `flat` prop; `usePressed` callers get a documented pressed fill (`bg-surface2`) because `opacity: 0.85` is invisible on cream (`pressable.ts` exposes `pressedClass`); `ProgressRail` gets `tone: 'accent' | 'danger'`; `Toast` gains `tone="info"` (ink fill, cream text); `Chip` keeps `shape="pill"` for pressable filters; status vocabulary for the whole app: **gold = the candidate's own input / active**, **ink = deliberate flag (marked)**, **red = wrong / unanswered / critical**, **green = eligible / correct (text `okInk`)**; warning (timer ≤ 5 min) = `accentSoft` fill + `accentInk` digits, critical (≤ 60 s) = solid `dangerInk` with `onInk` digits (never `#f87171` with cream text, 2.5:1).

## Screen patterns (six new `src/ui` pieces, each with tests + a dev-gallery section)
| Pattern | What it is | Replaces |
|---|---|---|
| **P1 PageHeader / BackHeader / Pill** | Hub header: `Brand` lockup + language switcher, then a **Pill** (rounded-full `surface2`, 1 px `line`, 6 px gold dot, tracked kicker label; tones `quiet`/`gold`/`ink`; optional `<Num>` leading) and a Playfair `titleLg`. Leaf header: today's `BackHeader` moved to `src/ui`, `surface` bar with a `line` under it, Inter 600 one-line title, `trailing` + `children` slots | `Kicker` rows, `Chip tone="label"`, `features/result/Header.tsx` |
| **P2 SurfaceCard** | `Card`: surface, 1 px line, `rounded-md`, `shadow.card`, padding 16; selected = 2 px gold + `accentTint`; exactly one card per screen carries a 3 px gold start edge (`startEdge()` from `features/result/edge.ts`) | all coloured start edges except that one; `sand`/`hazard` edges |
| **P3 StatTile** | `surface2` tile, `<Num variant="stat">` ink, caption ink3 | `HomeView` tiles, `Dialog` stat tiles, Category grid tiles |
| **P4 MarkerRow** | 56/72 px row: leading marker (gold dot = available, ink check-circle = done, ink3 lock = locked), ink 600 title, ink3 meta, trailing pill or chevron, hairline | Study/Library/Profile/Result/Affairs rows |
| **P5 ActionBar** | Sticky bottom bar: surface, 1 px line, `shadow.sheet` upward, one `Button size="lg"` primary + optional secondary; hosts the Keypad on Login/OTP | ad-hoc footers on Login, OTP, Post, Category, Result, Attempt, Palette |
| **P6 EmptyState / Skeleton / LoadError** | Centred pill kicker + one ink3 line + optional secondary; skeleton blocks `surface2` | `news/Empty.tsx`, `result/Placeholder.tsx`, Topic not-found, Solutions all-correct |
Icons: Ionicons (already used by the tab bar) for `close`, `lock-closed-outline`, `bookmark(-outline)`, `time-outline`, `cloud-offline-outline`, `checkmark-circle`; chevrons stay the `Glyph` `‹ ›` (tests pin their face).

## Phase B — Shell screens (F-29)
Welcome, Login, OTP, Post, Category, Home, Profile + the six patterns above + gallery sections. No logic, route, store or string changes; 0 new locale keys.
- **Welcome**: `Brand variant="splash"` centred over a brand pill; step counter → pill with `<Num>` "1 / 3"; Playfair title (max two lines); dots 8 px round, active stretches to a 20 px pill; footer = P5 without the top line (Skip ghost, Next/Get started ink `lg`); 140 ms fade per slide under `useMotion()`.
- **Login / OTP**: small `Brand` lockup, Playfair `titleLg`, `PhoneField`/`OtpCells` surface boxes with 2 px gold focus, keypad + Continue/Verify inside a P5 bar; error toast floats 12 px inset; OTP dev-code hint → pill; resend link ink 600 with a gold dot.
- **Post / Category**: step pill, Playfair title; Post cards are P2 `rounded-lg` with a gold `checkmark-circle` when selected (uses the new `Card trailing`); Category tiles become selectable P3 tiles (label, `<Num>` %, "PWT qualifying"); Continue/Start in a P5 bar.
- **Home**: `Brand` lockup + Sign-in outline pill + language switcher; Playfair greeting; hero = the one gold-edged P2 (kicker pill, `<Num>` days in ink, streak as a pill, target bar segments round gold/line); section heads = pill + ink 600 link with ink chevron; notice shelf cards P2 with kind pills; physical card keeps the only ink primary (`lg`); affairs = one P2 of P4 rows (gold dot, `accentInk` category, ink3 date); progress = shared P3; block rhythm 28 px. All testIDs, `heroLabel`, RTL `scrollToEnd`, one-primary rule unchanged.
- **Profile**: Playfair `titleLg`; sections = P2 groups of 56 px P4 rows; `Toggle` gold/ink; Log out outline, Delete `dangerInk` outline; guest card Playfair subtitle + ink Sign in.
- Tests: 7 snapshots refreshed; font literals in `WelcomeView.test` / `HomeView.test` follow A2; design critic on en + te captures of the 7 screens (+ Home guest / exam-day / held states from `ShellStates`).

## Phase C — Content screens (F-30)
Study, Topic, Library, Paper, Updates, Affairs, Eligibility.
- **Study**: hub header; each section heads on a `Pill` carrying its index as an `ink3` `<Num>` (4.66:1 on the pill's `surface2`; **not** `accentInk`, which is 4.25 there, and not a `Kicker`, whose 10.5 px is below the caption floor — fix wave 1, A2); each section = one P2 of P4 rows (gold dot unread / ink check read, minutes ink3, ink3 chevron). The mark is the state and says it once: **no trailing "Read" pill** beside the check that already says it (fix wave 1, D13).
- **Topic**: section pill, Playfair title; paragraphs ink2, bullets get a 6 px gold dot instead of `■`, formula = `surface2` inset, example = the one gold-edged P2 with a "Worked example" pill, tip = `surface2` block with an "Exam tip" pill; footer stays in flow (Mark as read ink primary; read badge = quiet pill).
- **Library**: filter chips = `Chip shape="pill" size="lg"` (active gold fill + ink 700); shelves = P2 of P4 rows; Free/Locked/Best as quiet pills (Locked gets a leading `lock-closed-outline` and `testID="library-lock-<id>"`, replacing the `⛌` glyph); Practise `secondary` `md` + View paper `ghost` — **neither is the ink fill**, because one ink fill per screen counts every instance and this pair is drawn once per row (fix wave 1, A1); locked toast `info`. A shelf with nothing on it is a P6 `EmptyState` with no dot (`library.empty`, the one key pair the fix wave adds), reachable through the view's `tests` prop.
- **Paper**: leaf header + section pills; question cards P2 with a "Q n" pill; correct option = `accentTint` fill + a 3 px `accentStrong` edge **taken out of the option's own padding**, so the key's text keeps the other three options' axis (fix wave 1, D8), + a 20 px **`accentStrong`** disc with an ink check — the token, not "gold": a bare ✓ on the card is 2.42:1 and an `accent` disc on the tint 2.16, both under the 3:1 mark floor, while `accentStrong` there is 3.11 (fix wave 1, D1); Why pill.
- **Updates / Affairs**: leaf header with the Sample-data tag pill; notice cards P2 with kind pill, ink3 date, ink3 caret (face + rotation tests unchanged), gold start edge only while expanded and **drawn by `Card`, which gives back only the two pixels it added over its own `line`** so an open card keeps the closed cards' 17 px axis (fix wave 1, D8); the link row hugs the reading edge through `dir()` and gives its target padding back as a negative margin (D10); affairs = day pill with `<Num>` date + one P2 of P4 rows (the `sand` edge goes, and its two assertions with it), the summary a `small`/`ink2` node at 9.13:1 rather than the pattern's `caption`/`ink3` at 5.0 (fix wave 1, A3).
- **Eligibility**: quiet `SegmentedChips` (48 px cells, the floor on the cell and not the frame), their labels in the **field-label shape** the seven measurement fields use — `body`/600/`ink2` — so **exactly one `Pill`** heads the screen, "Your measurements" (fix wave 1, D7); inputs surface `rounded-md` with a padding-compensated 2 px gold focus, an ink3 placeholder and the UA focus ring suppressed on web (`outlineStyle: none`; the brand ring is 3.37:1 and is drawn for pointer and keyboard alike — D2); ink Check in flow (it scrolls to the verdict), verdict banner `okInk`/`dangerInk`/`ink3` tones with Playfair subtitle, its to-do list `ink2` behind ink dots (`ink3` is 4.43:1 on the red tint and a gold dot 2.96 — D3), result rows in a P2 with `okInk` ✓ / `dangerInk` ✕.
- Tests: 6 snapshots; assertion rewrites at `LibraryView.test.tsx:74`, `PaperView.te.test.tsx:31`, `AffairsView(.te).test.tsx` edge lines; critic captures 7 screens × en/te plus empty/not-found states.

## Phase D — Attempt, palette, result, solutions (F-31)
- **Attempt header**: surface bar with `line` + `shadow.card`; exit → Ionicons `close`; `TimerBox` normal `surface2`/ink, ≤ 5 min `accentSoft`/`accentInk`, ≤ 60 s solid `dangerInk`/`onInk`; section tabs = pills (active gold; locked = ink3 with a lock icon via `Chip leading`, `LOCK_GLYPH` concat removed); `ProgressRail tone="danger"` when critical.
- **Critical-time signal replaces the hazard rail** (`Screen rail critical` removed from `AttemptView.tsx:281`): solid red timer box + red progress fill + a static 4 px `dangerInk` `HeaderBand` above the header + the existing pinned 1-minute toast and haptic. Fully static, so reduced motion needs no branch. `Rail` stays for the dev gallery.
- **Body**: Q badge pill with `<Num>`; marks pill (`+1` `accentInk`, `−0.25` `dangerInk`); Marked = ink pill with a filled bookmark; options = surface rows, 1 px line, `rounded-md`, no shadow; selected = 2 px gold + `accentTint`, key box gold with ink letter; time-on-question `time-outline` ink3.
- **Footer** = P5: Clear ghost (keeps `size.clearBtn`), Mark outline with bookmark icon fill toggle (no second filled control), Prev outline square, Questions outline with `<Num>` "12 / 40", Next ink `lg` (`size.nextBtn`). `Button variant="hazard"` retires.
- **Palette sheet**: surface sheet, `radius.xl` corners, ink4 grabber, warm scrim; `paletteState` = unvisited surface/line/ink3 · unanswered `dangerTint` + 2 px `dangerInk` · answered gold + ink numeral · marked ink + cream numeral · marked+answered ink with a gold dot in a cream ring · current = 2 px ink ring offset 2 px; locked group opacity stays; Submit ink in a P5 strip.
- **Dialogs**: surface card `rounded-lg` top corners, `shadow.sheet`, tone pill (gold / `accentInk` exit / `dangerInk` auto-submit), Playfair title, ink2 body, P3 stat tiles, ink `lg` primary + outline; scrim fade 140 + card slide 180 through `useMotion()`. Banner = `surface2` with `cloud-offline-outline`; toasts `accent` (5 min) / `danger` (1 min) / `info` (locked). Call overlay stays dark (`bg-ink`, cream text) on purpose.
- **Result**: leaf header; score = the one gold-edged P2 ("Your score" pill, `<Num variant="score">` ink, "/ 100" ink3); Qualified = gold pill, Below cut-off = `dangerTint` pill with `dangerInk` text; section index digits `accentInk`; cost values `accentInk` 700; action cards P2; CTA in a P5 bar. **Solutions**: filter pills with counts; badge = 28 px circle (gold + ink ✓ / `dangerInk` + cream ✕); your answer = `dangerTint` + red edge, correct = `accentTint` + gold edge; all-correct → P6.
- All 14 gallery states keep their buttons; tests: 3 snapshots; rewrites at `AttemptView.test.tsx:91-123` (timer colours) and `PaletteCell.test.tsx:22-44`; critic captures all 14 states in en and te (28) plus Result/Solutions variants; one Expo Go pass on Android for the timer digits and shadows.

## Phase E — Rename legacy tokens (chore, after D)
Codemod the unambiguous names (`tar→canvas`, `panel*→surface/surface2`, `line2/3`, `chalk*→ink/ink2`, `dim/steel→ink3`, `mute/ghost→ink4`, tints), manual pass for `hivis/hazard/flag/sand/success` (fill vs text), delete `legacyColors` and the aliases (`HazardRail`, `dangerOutline`, `hazard` variant), flip `legacy.test.mjs` to scan all of `src`, full snapshot refresh, `DESIGN_SYSTEM.md` final.
- **Also delete `Chip tone="label"`** with the other legacy tones (deprecated in the F-30 fix wave: `Pill` is the tag, and only the dev gallery still renders the old one) and its `LabelChip` branch, and drop the gallery's demo of it.
- **Give `BackHeader` an optional `title`** and put Topic on it (F-30 fix wave, D17 — tracked, not fixed): Topic is the only leaf screen without the bar, carrying a bare `BackRow` beside its language switcher instead. Changing it now would move the language switcher and the title on the one screen a reader spends the longest on, in a wave whose other items are one- and three-pixel corrections.

## Docs and tracking
`docs/FEATURES.md` rows F-28..F-31 (+ chore), `docs/IMPLEMENTATION_PLAN.md` Phase 4 lines + dated rulings (theme, buttons, fonts, brand lockup, hazard rail replacement, palette semantics), `docs/DESIGN_SYSTEM.md` rewrite in A5 + a "Screen patterns" section in B, `docs/specs/2026-09-05-brolly-rebrand-design.md` (this plan's design content as the spec), `CLAUDE.md` identity line, `.claude/rules/mobile-ui.md` (no hazard rail, one gold-edged card per screen, gold never as text below the 700 shade, pressed fill not opacity).

## Execution
Sequential, one implementer per phase in the main checkout (worktrees are not worth it: every phase touches the same primitives/snapshots), each phase = commits on `main` reviewed by code review + i18n reviewer (parity, `<Num>`, te faces) + design critic on en/te captures, one fix wave, scoped re-review, then push to `origin` (brollysolutions). The Docker web image is rebuilt at the end of each phase so http://localhost:3201 shows it. Estimated size: A ≈ 100 files (mostly tests/snapshots), B ≈ 25, C ≈ 20, D ≈ 15, E ≈ 55.

## Verification (per phase)
- `pnpm typecheck && pnpm lint && pnpm test` (mobile jest, i18n parity, the new tokens contrast + legacy tests), `pnpm doctor` after A5.
- Playwright captures at 390 px of every changed screen in `?lang=en` and `?lang=te` against `expo start --web` (scratchpad only), reviewed by the design critic against this plan and the site; measured checks: no text below 4.5:1, one filled primary per screen, Playfair titles wrap ≤ 2 lines, Telugu pills not clipped, tab-bar labels clear.
- Expo Go on the Android emulator once per phase: fonts loaded (no fallback), `<Num>` timer digits steady across 9:59 → 10:00, shadows and pressed fills visible, splash cream with the logo.
- Docker: `pnpm docker:up` (with the port overrides on this laptop) and the login → OTP → paper → result flow still passes in the containers.

## Risks
- **Contrast**: `ink3` is only 5.0:1, so nothing smaller than `caption` may use it; gold is never text except `accentInk`; the contrast test enforces the pairs. Telugu kickers floor at 12 px.
- **Playfair has no Telugu**: te titles use Noto 700 at the same size; Playfair is wider than Inter, so every title gets a two-line allowance.
- **Snapshot churn**: the foundation refreshes all 16 once; each phase refreshes only its own set after the critic's yes, so reviews judge captures, not `.snap` diffs.
- **Palette semantics** differ from CBT conventions (green/red/purple); the legend with counts explains them in place, and a re-tune later is a token edit.
- **Shadows** render as CSS on web, `boxShadow` on RN 0.86 native; Android below API 28 approximates the warm tint. Tab bar keeps `elevation: 0`.
- **Icon set**: a 1024 px app icon needs a raster of the favicon SVG (`@resvg/resvg-js` one-off) — if not feasible in-session the old icon files stay and it is listed as a follow-up; the splash can ship from the 552 px PNG immediately.

## Addendum — Phase A as built (2026-09-05)
- Six commits on `main`: A1 tokens + aliases (`ee6cacb`), A2 fonts (`4249118`), A3a primitives (`877d15d`), A3b primitives + Rail (`fa440f3`), A4 Brand (`dc6524b`), A5 splash/icons/docs.
- **Palette semantics** follow the decision table and Phase D, not the A3 line: answered = `accent`/ink, marked = `ink`/`onInk`, not-answered = transparent + `dangerInk` outline (the `dangerTint` fill waits for Phase D), current ring = 2 px ink at −4 px inset (a 2 px canvas gap), a+m dot = `accent` in a `surface` ring.
- `hazard` token block and `motion.marquee` were dropped in A3b (with `HazardRail`), not A1, so every commit stayed green; `legacy.test.mjs` shipped skipped in A1 and went live in A3b for the same reason.
- `typography()` takes an options object (`{ italic, numeric }`) rather than a bare `italic` flag: `numeric` pins `<Num>` to Inter at display sizes (the decision says numbers are always Inter). A `wordmarkSub` (13) role joins `wordmark` (17) for the italic "Solutions".
- Chip `sand` maps to `accent` (with `hivis`/`hazard`); `flag` to `danger`. Segmented dividers are always `line2` (the quiet-selection edge logic went with `line3`).
- Icons were rasterised with `sharp` (already resolvable on the machine), not `@resvg/resvg-js`; the iOS `expo.icon` template bundle was removed in favour of the 1024 `icon.png`. `brolly-logo-yellow.png` was not committed (reference only).
- Welcome's brand-plate assertions (`WelcomeView.test.tsx:48,76`) now assert the labelled logo image plus the "Practise the real PWT" title rather than a Latin-faced "PWT" plate; no tagline key was added.
- Card shadows add `boxShadow` lines to the snapshots beyond the promised fontFamily/class/hex lines.
- `line2` was not aliased to `line`: it is the semantic strong outline (`#ccc7bd`), and a legacy key of the same name would have been shadowed by the semantic block anyway (the two blocks share no key; the preset's merge order is defensive). The six legacy sites that drew it as a divider (`PaletteSheet` ×2, `EligibilityView`, `HomeView`, `ProfileView`, `ResultView`) moved to `line` in fix wave 1; the rest follow in B/C/D.
- Docs (`CLAUDE.md`, the rules) were rewritten in A5 rather than A1, as the execution list placed them.
- `TopicView.test.tsx`'s edge test asserted two different accents; `hivis` and `sand` both alias `#856a22`, so the test pins the shared edge and an `it.failing` case named for F-30 holds the Phase C intent (only the worked example keeps the edge). The same pattern guards `AffairsView`'s category kicker ("never the primary accent") and its card edge.
- `hivis`, `hazard` and `sand` collapse to `#856a22` until Phases C/D restore distinct tones; the exit and auto-submit dialogs are tonally identical apart from the kicker colour until Phase D.
- The root `doctor` script pointed at a binary that never resolved (`expo-doctor` is not installed locally) — it never ran; it now runs `npx expo-doctor`.
- **Fix wave 1 (2026-09-05, after code + design review).** Tokens: `outline` (`#938b80`, 3.0:1 on canvas, 3.1 on surface) for control boundaries and `okTint` (`rgba(34,197,94,.12)`); `contrast.test.mjs` gained an rgba parser + alpha compositor, pins `accentInk` over `accentTint` (4.14) and on `surface2` (4.25) as below AA, `ink` over `accentTint` (14.0), `dangerInk` over `dangerTint` (5.1), `okInk` over `okTint` (5.8), and a non-text block (`outline`/`accentStrong` ≥ 3; `line`/`line2` structure only); `scale.test.mjs` pins the ramp and tracking. Type ramp caption 12 · small 13 · body 15 · bodyLg 16 · question 17.5 (kicker, display roles, wordmarks, stat/timer/score/field/otp/keypad/cell/prefix/glyph unchanged); Telugu display roles in Noto Serif Telugu 700 on a 1.5 line-height (`@expo-google-fonts/noto-serif-telugu`); tab labels on their own 16 (en) / 19 (te) px line. Primitives: Chip `muted` = weight 500 at ink3 (ink4 was 2.8:1), resting border `outline`, selected accent chip and selected segment carry a 2 px `accentStrong` inner bottom edge; Button `secondary` border `outline`, disabled primary = surface2 in the outline ring with ink3; SegmentedChips frame `outline` (dividers stay `line2`); Keypad/OtpCells/PhoneField idle `outline`; Toast `danger` = `dangerInk` + cream; Banner = Ionicons `cloud-offline-outline` in ink3; Card keeps press feedback when selected (dims, tint stays); the not-answered palette cell fills surface2 when held; Brand = 22 px umbrella, italic "Brolly", roman "Solutions" with `tracking.brand` (the token's one consumer). Assets: rasters recoloured to `colors.ink` in `make-brand-assets.mjs`, umbrella gets a 3 px transparent bleed (263×168), `icon.png` flattened on navy, `sharp` 0.35.4 pinned as a mobile devDependency. Screens pulled forward: ink kickers/keys/ticks on the tinted answer blocks (`SolutionsView`, `PaperView`, the gallery's state tiles — `EligibilityView`'s verdict title is 19 px/700, large text, and passed at 3:1 until D17 made the eligible verdict green: `okInk` on `okTint` in an `okInk` border); Home's affairs rows lost their `sand` edge and the hero's edge is `accentStrong` (one gold-edged card on Home). `app.json`: name "TSLPRB Prep", slug "tslprb-prep", scheme "tslprb" — no EAS project is linked yet, so these are changeable. Lockfile: adding the two packages flipped `@types/node` peer resolutions (26.4.0 ↔ 22.20.1) inside `pnpm-lock.yaml` — pnpm's own drift, no version changed.

## Addendum — Phase B as built (2026-09-05)
- Five commits on `main`: P1 patterns (`31c3fb9`), P2 patterns (`6ea1fbd`), Welcome/Login/OTP
  (`bb5a899`), Post/Category/Home/Profile (`78b7c6b`), docs (`19a016e`). Fix wave 1 after the
  code and design reviews: `5fc0e54` (the machine's auto-commit swept the primitive sources
  before they could be staged, as it did three times during the phase itself), `301146e`
  (screens), `d4be6ba` (tests) and this docs commit.
- **Accepted deviations** (nine, with the eight the phase reported):
  1. No per-slide fade on Welcome. `entering` on a virtualized row fires for every row at
     mount, and the pager already carries the motion.
  2. Post cards keep the `md` card radius. `Card` hard-codes `rounded-md`, and a second radius
     class on the same element is the "two competing classes" defect the rules ban. **Phase C
     gives `Card` a `radius` prop** so the spec's `lg` corner can land without that.
  3. The guest card's subtitle stays Inter. A Playfair role between 19 and 24 px does not
     exist, and `title` (24) inside a card would compete with the screen title. (Fix wave 1
     moved its *body line* from `caption` to `body`, which is the readability half of it.)
  4. No "brand pill" on Welcome: the copy for one does not exist, and 0 new locale keys was
     the harder constraint.
  5. The auth error toast keeps `Toast`'s 16 px inset — a primitive shared by four screens.
  6. `LoadError`'s badge. It began as a `Chip tone="danger"`; fix wave 1 made it the same
     24 px `Pill` as `EmptyState` with a `danger` dot, so the two waiting states are one
     family and the decorative badge stopped announcing `selected`.
  7. The `Pill` label is `caption` (12 px), not the 10.5 px kicker the spec's wording implies:
     `ink3` is 4.7:1 on `surface2`, and nothing at that ratio goes below caption size.
  8. Home's affairs category is `ink3`, not `accentInk`: it is a `MarkerRow` meta line now,
     and the pattern owns that tone. Phase C rules on the affairs category colour.
  9. **Category tiles stay `Card` + `<Num>`, not `StatTile`.** The step is a single-choice
     grid and `StatTile` is not pressable. **Phase C is to give `StatTile` a selectable
     variant**; until then the grid is a `Card` that reports `radio`/`checked`.
- **Fix wave 1 rulings that outlive the phase.** A dot on a `Pill` is status (mine, active,
  failed, passed), never decoration — a section heading carries none. Chrome owns the space it
  sits in: `ActionBar` takes the bottom safe-area inset (its hosts pass
  `Screen bottomInset={false}`, following the tab bar) and `PageHeader` owns the 20 px every
  page opening starts on. `hitSlop` is not implemented in react-native-web, so a small control
  grows its target with padding given back as negative margin, never with slop. A single-choice
  card reports `accessibilityRole="radio"` with a checked state; a card or chip with no
  `onPress` announces no selection at all. The selected card's 2 px edge is `accentStrong`
  (3.37:1) — `accent` measured 2.34:1 against the cream around it, and the contrast test now
  pins the edge against both its neighbours. `line`/`line2` on `surface2` measure 1.07:1: the
  fill is the boundary and the hairline is texture. Every screen pattern takes a `className`
  and an optional `testID`; icon sizes are `size.icon` (18) and `size.iconLg` (22).
- **Phase C follow-ups recorded here**: `Card` gets a `radius` prop; the affairs category tone
  is Phase C's ruling; the `Chip` label/kicker note from the design critic's deviation 7 is a
  Phase C item. (A selectable `StatTile` was on this list and is struck: Phase C found no
  caller and Phase D has none either — Result tiles are read-only, the palette is `PaletteCell`
  and the filters are `Chip`s — so the closing ruling lives in `DESIGN_SYSTEM.md` instead.)

## Addendum — Phase C as built (2026-09-06)
- Six commits on `main` (base `e1f6c32`): patterns (`13972d0`), Study + Topic (`7f42f0f`),
  Library + Paper (`89bd79c`), Updates + Affairs (`724d596`), Eligibility (`e00a253`), and one
  fix commit for the three defects the 390 px captures found (`b0c5358`). Nothing pushed.
- **The three Phase B follow-ups.** `Card` gets `radius` (`md` | `lg`) in one class slot and
  `PostView` takes the `lg` corner. `MarkerRow.meta` widens to a node, because Study's minutes
  and Library's "40 questions · 60 min" are digits and a digit lives in `<Num>`; a node is
  **silent in the composed accessibility name**, so a row carrying one names itself.
  `MarkerRow` also gains `titleTestID` / `metaTestID`, the split `PageHeader` already makes, so
  Affairs keeps `affair-headline-<id>` and `affair-summary-<id>`. **A selectable `StatTile` was
  not built**: nothing in Phase C selects a tile (Eligibility picks with `SegmentedChips`,
  Library with `Chip`s), and a variant with no caller is an API guess. The category grid stays
  a `Card`.
- **Rulings this phase makes.** The affairs category is a **quiet pill** with no gold — the
  tone Phase B parked. A gold start edge marks **the open card**, not every card in a list
  (Updates). A card of rows **hugs its rows** and the scroller around it takes the height. The
  correct answer's tick sits in a **20 px gold disc**: a bare gold ✓ on cream is 2.3:1, under
  the 3:1 floor for a mark. A **gold index digit stays on the canvas** — `accentInk` is 4.25:1
  on a pill's `surface2`, so Study's section numbering is a `Kicker`, not a pill's leading
  `<Num>`.
- **Accepted deviations** (five):
  1. **`study-chevron-<id>` retires.** The pattern owns the chevron and names its own `-end`
     slot; the ID had one consumer, `StudyView.test`, which now reads `study-row-<id>-end`.
  2. **The previous-papers shelf keeps one ink Practise per row.** The spec names the ink
     fill; the one-ink-primary-per-screen rule is about screen chrome, and a shelf of two
     papers therefore shows two. Flagged for the design critic rather than silently resolved
     either way.
  3. **Study's section index is a `Kicker` on the canvas**, not a pill's leading `<Num>` —
     the contrast rule above.
  4. **The library shelf is a `ScrollView`, not a `FlatList`.** A shelf is four papers at
     most, and a `FlatList` needs a bounded height, which is what put two rows at the top of a
     viewport-tall empty card in the first capture pass. `library-list` is unchanged.
  5. **Updates' notice body steps up from `caption` to `body`/`ink2`.** A notice is prose, and
     12 px `ink2` under a 15 px title read as a footnote.
- **Test rewrites beyond the three the brief named**: `PaperView.test`'s correct-option style
  (`hivis` → `accentStrong`, plus the disc), `UpdatesView.test`'s link row (gold chevron → ink
  label + `ink3` chevron) and its row floor (`min-h-[72px]` → the pattern's `min-h-touchLg`),
  `StudyView.test`'s read badge and chevron, and the two vacuous
  `not.toMatch(/bg-hivis/)` sample-data lines, which now assert the pill they describe. All
  **three** Phase A `it.failing` guards (Topic ×1, Affairs ×2) are real assertions, and so are
  the two `sand`-edge assertions beside them — five converted lines, but only three were
  `it.failing` (fix wave 1, code review 7).
- **Seven** snapshots refreshed: Library, Topic.te, Paper.te, Updates.te, Affairs.te,
  Eligibility.te and `PostView.te` for the `lg` radius. Mobile 856 tests / 96 suites / 16
  snapshots; tokens 44; i18n 4.

## Addendum — Phase C fix wave 1 (2026-09-06)

Three commits on `main` (base `dba672d`): the primitives (`e5ab5db`), the seven screens
(`0478093`) and the docs (this one). Nothing pushed.

- **The theme of the wave was that rulings had outrun the build.** Three of them were written
  into `DESIGN_SYSTEM.md` and into source comments in a form the code did not meet: the gold
  disc "clears the 3:1 mark floor" (it measured **2.16:1**, worse than the 2.42:1 bare tick it
  replaced), the open notice "sits on the same axis" as the closed ones (it sat a pixel inside
  them), and a gold index digit was codified at a size the caption floor two sections above
  forbids. Every ratio in this spec and in `DESIGN_SYSTEM.md` was re-measured against the
  tokens; the corrected numbers are in the lines above.
- **The primitive, not the screen, owns the arithmetic.** `Card startEdge` draws the bar and
  compensates its own padding, because a bar that REPLACES a border gives back only the
  difference (two pixels over `Card`'s 1 px `line`, three over a bare box). `UpdatesView` and
  `TopicView` lost their copies of the sum; `startEdgeInset(isRTL, pad, borderWidth)` serves the
  one site that is not a card.
- **Rank is said once, and never twice in two shapes.** Two ink Practise buttons per shelf,
  four pills where the spec drew one, a "Read" pill beside the check that already said it, a
  gold dot on a news row that is not a to-do: each drew a second voice for a rank already
  spoken. One ink fill per screen counts every instance, per-row buttons included.
- **Types where a doc comment used to be.** `MarkerRow`'s a11y contract is a prop union: a node
  `meta` is silent only in a COMPOSED name, and only a pressable row composes one, so a node on
  a button drags an `accessibilityLabel` in with it and a node on a static row needs none. The
  union caught the existing test that rendered the forbidden shape.
- **One new key pair**, `library.empty` (en + te) for the empty shelf; nothing else was added.
- **Tracked, not fixed.** D16: "62.25 Best" reads backwards in English while the Telugu order is
  correct, so it is a copy decision for the standing native-copy review, not a guess to make
  here. D17: `BackHeader` gains an optional `title` in Phase E (above).
- Mobile **873 tests / 96 suites / 16 snapshots** (856 at `dba672d`); tokens 44; i18n 4.
  Eight snapshots refreshed, every diff read by category.

## Addendum — Phase D as built (2026-09-06)

Four commits on `main` (base `37face2`): the primitives (`9743c44`), the attempt screen with its
palette, overlays and toast tones (`d93799d`), Result and Solutions (`b1dc03f`), the two dev
gallery sections plus the option-key face fix (`4a4c78b`), and this docs commit. Nothing pushed.

- **The critical-time signal is fully static, as the plan asked**: a 4 px `dangerInk`
  `HeaderBand` (new `size.band` token) over the header, a solid `dangerInk` timer box and a red
  progress fill, with the pinned one-minute toast and haptic already in place. `Screen` loses
  `rail`/`critical` with its last caller; `Rail` and `motion.pulse` survive for the dev gallery.
- **Accepted deviations** (five, each measured on the running build):
  1. **The five-minute timer's digits are ink, not `accentInk`.** `accentInk` on `accentSoft`
     measures **3.34:1** — AA for the 23 px numeral, under it for the 12 px "TIME LEFT" above
     it, and a label darker than the figure it names inverts the hierarchy. The `accentSoft`
     fill under an `accentStrong` edge is what says "warning"; ink carries the text, as it does
     on every other tint in the system. `DESIGN_SYSTEM.md`'s timer line is corrected to match.
  2. **The unvisited palette cell keeps the `surface2` fill**, not the `surface` the Phase D
     bullet names: the grid sits on a `surface` sheet, where `surface` measures **1.00:1** — a
     cell, and a 14 px legend swatch, with no edge at all. `surface2` is 1.12 there, the same
     "the fill is the boundary" model `Pill` and `StatTile` document. The border takes the
     spec's `line`.
  3. **The marks pill is ink and `dangerInk`, not `accentInk` and `dangerInk`.** Gold text on
     the pill's `surface2` is 4.25:1, and gold in this app means the candidate's own input,
     which the exam's marking scheme is not. Ink rewards, red penalises.
  4. **Result's section indices are `ink3` numerals on pills, not `accentInk`** — the standing
     F-30 fix-wave ruling ("a printed index is not gold"; `accentInk` on a pill is 4.25:1),
     which outranks the Phase D bullet written before it.
  5. **Result's "where you stand" and "what cost you marks" rows moved into `Card`s.** The
     bullet only names the score card, the action cards and the CTA bar; a run of rows on the
     bare canvas separated by 1.15:1 hairlines was the one block on the screen with no shape,
     and every other list of rows in the app is a card of rows since Phase C.
- **`ActionBar` gains `grow`.** The attempt footer's Next is 112 px (`size.nextBtn`, which the
  Phase D bullet pins) and shares its row with a square Prev and a Questions button, so the
  remaining width has to go to the secondary slot rather than to a `flex-1` wrapper the button
  cannot grow into. One prop, one caller, tested both ways.
- **`Dialog`'s tone becomes a pill.** `accent` (exit, submit, resume) is the gold pill, `danger`
  (auto-submit) the quiet pill with a red status dot — red is a verdict and lives in the dot,
  the `LoadError` ruling. The exit and auto cards are visually distinct for the first time since
  Phase A recorded them as "tonally identical apart from the kicker colour".
- **One regression this phase introduced and fixed inside it**: the option key was forced into
  the Latin face on the ground that A–D is a glyph. It is not — `test.optionKeys` is A–D in en
  and అ–ఈ in te, and Inter draws the Telugu letters as tofu. The key is back in the language's
  own face and `AttemptView.te.test` pins it.
- **Known, pre-existing, not this phase's**: the palette `Sheet` does not mount in the web
  build. A `snapPoints: ['82%']` modal gets no container height there, so `present()` renders
  nothing; the gallery's own content-sized `Sheet` (section 07) opens normally. Verified by
  re-probing with the pre-F-31 `PaletteSheet.tsx` checked out, which behaves identically. The
  palette's cells were reviewed instead through gallery section 10, where every state renders.
- **Retired here**: `LOCK_GLYPH` (`AttemptView.tsx:38`), `Button variant="hazard"` on the
  attempt footer, and the `sand` kicker at `SolutionsView.tsx:144` — the last of that alias in
  the product. Phase E deletes the aliases themselves.
- **0 new locale keys**; no route, store, string or product testID change. Toast tones in
  `app/test/[id]/index.tsx` moved from `hazard`/`flag` to `accent`/`danger`/`info` — three
  presentational literals, not logic. Mobile **898 tests / 97 suites / 16 snapshots** (890 at
  commit 2, 882 at commit 1, 873 at the base); tokens 44; i18n 4. Three snapshots refreshed
  (`AttemptView.te` twice, `ResultView.te`, `SolutionsView.te`).
