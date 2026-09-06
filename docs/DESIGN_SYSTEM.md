# TSLPRB design system — "Brolly on cream"

Source of truth: `packages/design-tokens/tokens.json` (Tailwind preset + TS object via `src/index.ts`). This page explains intent. Rebranded 2026-09-05 (F-28) to Brolly Solutions' identity; the spec is `docs/specs/2026-09-05-brolly-rebrand-design.md`.

## Identity
Warm and restrained: cream surfaces, charcoal ink, gold spent only where it means something. One ink-filled primary action per screen; gold marks what the candidate did (answered, selected, active filter, progress); ink marks a deliberate flag (marked for review); red is wrong / missing / critical; green is eligible / correct. Soft radii (4–16 px), 1 px hairlines for structure, warm ink shadows for elevation. Playfair Display carries titles and the wordmark; Inter carries everything else; Noto Sans Telugu carries Telugu text and Noto Serif Telugu its titles. The umbrella lockup is the in-app brand mark; "TSLPRB" and "PWT" stay in copy as the exam's name.

## Colour tokens
| Token | Hex | Role | Contrast on canvas |
|---|---|---|---|
| `canvas` | #f7f2e6 | screen background | — |
| `surface` | #faf6ec | cards, bars, sheets, dialogs, inputs | — |
| `surface2` | #f0e9d8 | tiles, disabled fills, tracks, quiet selection, pressed fill | — |
| `line` | #e9e2d3 | card borders, hairlines | 1.15 (structure only) |
| `line2` | #ccc7bd | dividers between rows, the sheet grabber, the segmented control's inner dividers | 1.5 (structure only) |
| `ink` | #211c17 | primary text, the primary fill, marked cells | 15.1 |
| `ink2` | #4a423a | body on cards, ghost buttons | 8.8 |
| `ink3` | #6f665b | captions, kickers, inactive labels — nothing smaller than `caption` | 5.0 |
| `ink4` | #989085 | decorative only: grabbers, decoration — never text | 2.8 |
| `outline` | #938b80 | the rest border of every interactive outlined control: secondary buttons, inactive chips, the segmented frame, idle keypad/OTP/phone boxes, the disabled primary's ring | 3.0 (3.1 on surface; non-text floor) |
| `onInk` | #f7f2e6 | text on `ink` | 15.1 (on ink) |
| `accent` | #c29b38 | brand gold: fills only (answered cells, selected border, toggle on) | 2.3 — never text |
| `accentSoft` | #e8cf7a | soft gold fill: active chips, the switcher, the 5-minute toast | ink on it 11.0 |
| `accentStrong` | #a17f2a | non-text gold: rails, progress fill, focus borders, start edges | 3.4 |
| `accentInk` | #856a22 | the only gold text: kickers, counters, active tab, links | 4.6 (4.8 on surface) |
| `accentTint` | rgba(194,155,56,.14) | selected card fill, ripples | — |
| `ok` / `okInk` / `okTint` | #22c55e / #166534 / rgba(34,197,94,.12) | green fill / green text / the eligible verdict's box | ink on ok 7.4 / 6.4 / okInk over okTint 5.8 |
| `danger` / `dangerInk` | #f87171 / #b91c1c | red fill (last-minute toast) / red text, outlines, critical rail | ink on danger 6.1 / 5.8 |
| `dangerTint` | rgba(185,28,28,.08) | wrong-answer block, danger chip fill | — |
| `navy` | #0a1e3a | the app icon tile only | — |
| `scrim` / `scrimHeavy` | ink at 45 % / 62 % | sheet / dialog backdrops | — |
| `pressTint` / `pressTintOnDark` | ink 10 % / cream 18 % | Android ripples on gold / on ink | — |

`packages/design-tokens/test/contrast.test.mjs` pins every pair above, composites the tints over their surfaces before measuring, and holds the 3:1 non-text floor. Rules that follow from it: `accentInk` is the only gold text and only on `canvas`/`surface` — gold text never sits on `surface2` (4.25) or on `accentTint` (4.14); ink carries the text on a tint and the edge and tint carry the meaning; `ink3` never below caption size; `ink4` never text; `outline` and `accentStrong` are the only boundaries a control may rest on, `line`/`line2` are structure only; the timer's warning state (`accentSoft` + `accentInk`, 3.3) is large bold text and no smaller (Phase D).

Legacy names (`tar`, `panel*`, `chalk*`, `dim`, `hivis`, `hazard`, `flag`, `sand`, …) survive as aliases in `tokens.json → legacyColors` so screens compile until Phase E renames them; `src/ui` may not use them (`test/legacy.test.mjs`). `hivis`/`hazard`/`sand` alias to `accentInk`, `flag` to `dangerInk`.

## Type
| Language | Text face | Display face (title, titleLg, display, wordmark, wordmarkSub) | Body | Line-height |
|---|---|---|---|---|
| en | Inter 400–800 | Playfair Display Regular + Italic, 1.2 line-height, −0.3 tracking (0 on the wordmark) | 15 | 1.5 |
| te | Noto Sans Telugu 400–800 | Noto Serif Telugu 700, 1.5 line-height, no tracking — Playfair has no Telugu | 15 | 1.65 |

`typography(lang, role, weight, { italic, numeric })` resolves the face; `<Num>` sets `numeric`, so digits stay tabular Inter at any size. Scale (`test/scale.test.mjs` pins it): kicker 10.5 (Telugu floor 12) · caption 12 · small 13 · body 15 · bodyLg 16 · question 17.5 · subtitle 19 · title 24 · titleLg 26 · display 30 · wordmark 17 / wordmarkSub 13 · score 58. Tracking: kicker 1.2, brand 2 (the wordmark's "Solutions"), display −0.3 (Latin only). Playfair is wider than Inter: every title gets a two-line allowance. The tab-bar label sits on its own line (16 en / 19 te), not the body line-height, so "Study" keeps its descender.

## Spacing & shape
4-pt grid; screen padding 16; card padding 12–16; gaps 8–12. Radii: `xs` 4 (tags), `sm` 6 (buttons, cells, inputs), `md` 8 (cards, toasts), `lg` 12 (dialogs), `xl` 16 (sheet top corners), `full` (pills, toggle). Shadows are warm ink: `card` (`0 6px 20px -12px` at 25 %) under cards, `raised` under toasts, `sheet` (cast upward) under dialogs — the bottom sheet is a `@gorhom` surface and carries no shadow of its own; `shadowStyle(name)` returns the `boxShadow` object. Touch targets 48 (secondary) / 56 (primary, keypad 58). The brand rule (`Rail`) is 3 px solid gold; red and pulsing while the attempt clock is critical.

## Components (apps/mobile/src/ui)
Brand (22 px umbrella + live Playfair wordmark in the logo's own structure — italic "Brolly", roman "Solutions" with the brand tracking; `splash` = the full logo) · BackRow (the leaf header's 48 px back control, surface2 when held) · Screen (`canvas`, optional `Rail`) · Text (ink; `italic` for the display face) · Button (`primary` ink fill, `secondary` outline, `ghost`, `danger` red outline, `accent` gold outline that fills when active; a disabled primary is surface2 in the outline ring with an ink3 label) · Card (surface, hairline, card shadow, `trailing` slot, `flat`, `radius` `md`/`lg` in one class slot; selected = 2 px gold + tint, title stays ink, and a press dims it rather than swapping the tint) · Chip (`accent` soft gold with a 2 px `accentStrong` bottom edge when selected, `danger` red tint, `ok` green, `label` the quiet surface2 tag; resting = outline border, `muted` = weight 500 at ink3) · SegmentedChips (`accent` for the header switcher, `quiet` for form pickers; outline frame, line2 dividers, the selected cell carries the 2 px gold bottom edge) · Kicker (ink3, `accentInk` counters) · Sheet (surface, xl corners, 3 px gold edge, line2 grabber) · Dialog (surface, lg corners, 3 px gold edge, surface2 stat tiles) · Toast (floating; `accent` soft gold + ink, `danger` solid `dangerInk` + cream — the one red for critical, `info` ink + cream) · Banner (surface2, `cloud-offline-outline` in ink3) · Keypad / OtpCells / PhoneField (surface boxes, outline idle, accentStrong focus) · ProgressRail (surface2 track, gold or red fill) · PaletteCell (plain unvisited · red outline unanswered · gold answered · ink marked · gold dot in a cream ring for both · 2 px ink ring with a 2 px gap for the current one · the outlined cell fills surface2 when held) · Toggle (round: gold/ink on, surface2/line2/ink3 off) · Row/Stack (direction-aware) · Num/Glyph/Measure/Duration.

Pressed feedback on cream is a `surface2` fill (`pressedClass`), never opacity — opacity is invisible between two creams. Filled controls (ink, gold) dim to 85 % instead (`pressedStyle`). A resting fill and the pressed fill share one class slot so two `bg-*` utilities never compete.

## Screen patterns (apps/mobile/src/ui)
Six compositions of the primitives above. A screen reaches for these before it writes a layout
of its own; each has a section in the dev gallery (`/dev/states`, section 12). P2 is not new:
the surface card the patterns sit in is `Card`, listed with the primitives above.

**The pattern API.** Every one of them takes an optional `className` (merged last, so a caller
can adjust layout — margins, flex — without forking the piece) and an optional `testID` (which
names its own inner parts: `<id>-row`, `<id>-mark`, `<id>-end`, `<id>-dot`, `<id>-retry`).
Nothing else is optional-by-omission: a pattern's other props describe its content, and a
caller that needs to override identity — a colour, a fill — is telling you the variant set is
missing something. A pattern is never a control unless the table says so.

| # | Pattern | Props | What it is |
|---|---|---|---|
| P1 | `Pill` | `label?` (a string, or a `<Trans>` that carries a `<Num>`), `tone` `quiet\|gold\|ink`, `align` `start\|center`, `dot`, `dotTone` `gold\|danger\|ok\|none`, `leading` | The label that names a block, a state or a step: a capsule with a minimum height (never fixed), a caption-size tracked label and an optional 6 px dot. `quiet` is `surface2` under a hairline with `ink3`; `gold` is the gold tint under `accentStrong` with ink; `ink` is the ink fill with cream. **A dot means status — mine, active, failed, passed — never decoration**, so a heading that only names a block takes `dotTone="none"` (or no dot at all). `align` routes through `dir()`, so the reading edge follows the language. Never a control — a pressable filter is `Chip shape="pill"`. |
| P1 | `PageHeader` | `brand`, `trailing`, `pill`, `title`, `subtitle`, `titleTestID` | The hub opening: the lockup and whatever sits beside it (the language switcher, a sign-in capsule), then a pill, then the screen's name in the display face. 12 px under the lockup, 8 px inside the pill–title–subtitle block. |
| P1 | `BackHeader` | `title`, `onBack`, `trailing`, `children` | The leaf bar: a 48 px chevron-back target and an Inter 600 one-line title on `surface` under a `line`, with a slot after the title and a second row beneath. |
| P3 | `StatTile` | `value?`, `label`, `empty`, `align` | One number and what it counts: a `surface2` tile, `<Num variant="stat">` in ink over an `ink3` caption, an em dash in `ink3` when there is nothing yet, read as one node. |
| P4 | `MarkerRow` | `title`, `titleTestID`, `titleLines`, `meta`, `metaTestID`, `marker` `none\|dot\|done\|locked`, `trailing`, `trailingLabel`, `chevron`, `onPress`, `first`, `accessibilityLabel` | The list row inside a card: a gold dot (to do), an ink `checkmark-circle` (done) or an `ink3` `lock-closed-outline`, an ink 600 title over an `ink3` line, a trailing pill or chevron, a hairline on top and a 56 px floor that grows with the label. `meta` takes a node as well as a string, for the one thing a string cannot carry — digits, which live in `<Num>`/`Measure`; a node draws itself and is **silent in the composed name**, so a row with one names itself. `titleTestID`/`metaTestID` let a screen keep the IDs it already had (Affairs' headline and summary) while the pattern keeps the typography. `titleLines` caps the title (left off, it grows). The mark and the trailing slot are boxed to one body line and pinned to the top, so a wrapped title keeps them on line 1 — a MINIMUM, so a tall trailing control (Profile’s language switcher) grows its slot rather than being clipped. A row that sets a label — its own `accessibilityLabel`, or the composed `title + meta + trailingLabel` — stops its children being read, which is why a trailing date needs `trailingLabel`. `trailing` is decoration: once `onPress` is set the row is one button and anything pressable inside it is unreachable. |
| P5 | `ActionBar` | `primary`, `secondary`, `children`, `bordered` | The sticky bottom bar: `surface` under a hairline with the sheet shadow cast upward, the one ink `lg` primary and a quiet partner, and a slot above them for the keypad. It sits outside the body's ScrollView and **owns the bottom safe-area inset** — its host passes `Screen bottomInset={false}`, the way a tab scene does. `bordered={false}` (the Welcome footer) drops the line and the shadow together. |
| P6 | `EmptyState` / `Skeleton` / `LoadError` | `message`, `title`/`action`/`blocks`/`onRetry` | The three waiting states, one family: a quiet pill over one `ink3` line (with an optional outline `action`); static `surface2` blocks in the shape of the content, hidden from screen readers; and the same 24 px pill with a `danger` dot over the reason and a 48 px outline retry. `EmptyState` and `LoadError` centre identically — a different badge on each read as two mechanisms. |

A single-choice card (the post step, the category grid) is `Card` with `selected`: it reports
`accessibilityRole="radio"` with a checked state, and its 2 px edge is `accentStrong` — the
brand `accent` measures 2.34:1 against the cream around it, under the 3:1 non-text floor. A
`Card` or `Chip` with no `onPress` announces no selection at all: a badge nobody can choose
saying "selected" is a lie. (`StatTile` still has no selectable variant: Phase C found no screen that selects a
tile, and a variant with no caller is a guess. The category grid stays a `Card`.)

`startEdge()` (from `features/result/edge.ts`) draws the 3 px gold start edge on the one card
per screen that carries it. Icons are Ionicons (`checkmark-circle`, `lock-closed-outline`,
`cloud-offline-outline`); chevrons stay the `Glyph` `‹ ›` so they never depend on the language
face carrying the character.

## Status vocabulary
Gold = the candidate's own input or the active state · ink = a deliberate flag (marked) · red = wrong, unanswered, critical · green = eligible, correct (text `okInk`). Timer (Phase D): normal `surface2`/ink, ≤ 5 min `accentSoft` fill + `accentInk` digits, ≤ 60 s solid `dangerInk` with `onInk` digits — never `danger` with cream text (2.5:1); the last-minute toast is the same `dangerInk` + cream pair. One gold-edged card per screen is the target rule (the hero, the worked example, the score): Home meets it since fix wave 1; the other screens converge in Phases B–D.

## Motion
Sheet 180 ms cubic-bezier(.2,.8,.3,1) from bottom; overlays fade 140 ms; toast 180 ms slide-down; the critical rail pulses opacity over 700 ms. All reduce to instant changes (the rail to a static red rule) under reduced motion. Haptics: selection on option/keypad, success on submit, warning on the 5-min/1-min toasts.

## Platform adaptation
Android (primary): edge-to-edge, gold-tinted ripples, predictive back handled in test (exit dialog), adaptive icon = gold "B" on navy. iOS: safe-area aware, sheet grabber, the same 1024 mark. Web: `boxShadow` renders as CSS; `?lang=` overrides the stored language for captures. Identity identical on all three.

## Rulings
- 2026-09-05 — Brolly rebrand (F-28): light cream theme, ink primaries, gold accents, Inter + Playfair; the hi-vis / hazard identity is retired. Tokens shaped so a dark palette can be added later.
- 2026-09-05 — No rail as screen chrome; `Rail` survives as the attempt screen's critical-time warning and in the dev gallery (Phase D replaces it with a static red band).
- Palette semantics differ from CBT conventions (green/red/purple) on purpose: the legend with counts explains them in place, and a re-tune is a token edit.
- 2026-09-05 — Fix wave 1 (F-28 review): `outline` (`#938b80`, 3.0:1) is the boundary of every interactive outlined control and `line2` keeps its semantic value as a divider (it is not an alias of `line`); the type ramp climbs to caption 12 · small 13 · body 15 · bodyLg 16 · question 17.5; Telugu display roles are Noto Serif Telugu 700; the header lockup follows the logo (italic "Brolly", tracked roman "Solutions", 22 px umbrella); the last-minute toast is the one red (`dangerInk` + cream); gold text never sits on a tint or on `surface2`; selected chips and segments carry a 2 px `accentStrong` bottom edge; a disabled primary is surface2 in the outline ring with ink3.
- 2026-09-05 — Phase B (F-29): the six screen patterns above are the vocabulary of every screen from here on. A `Pill` is a label and never a control; a `Chip` is the control. Gold is a fill, an edge or a dot — the section links, the countdown and the resend link are ink. `ink3` at caption size is the floor for a pill label. Blocks on a hub breathe on 28 px.
- 2026-09-05 — Phase B fix wave 1 (F-29 review): a dot on a pill is **status**, not decoration — a section heading gets none; the selected card's edge is `accentStrong` (3.37:1, where `accent` was 2.34); a static `Card`/`Chip` announces no selection and a selectable `Card` is a `radio`; `ActionBar` owns the bottom inset and pairs its shadow with its line; `PageHeader` owns the 20 px every page opening starts on, and no call site passes a top margin; `hitSlop` is not implemented in react-native-web, so a target grows with padding given back as negative margin; `line`/`line2` on `surface2` measure 1.07:1 — the fill is the boundary and the hairline is texture. Every pattern takes `className` and an optional `testID`.
- 2026-09-06 — Phase C (F-30): the affairs category is a quiet `Pill` with no gold — the tone Phase B parked. A gold start edge marks **the open card**, not every card in a list. A card of rows **hugs its rows**; the scroller around it takes the height, so a short shelf never floats in a viewport-tall box. The correct answer's tick sits in a 20 px gold disc (a bare gold ✓ on cream is 2.3:1, under the 3:1 mark floor). A gold index digit stays on the canvas: `accentInk` is 4.25:1 on a pill's `surface2`. A node `meta` on `MarkerRow` is silent in the composed accessibility name, so the row names itself. `Card` takes a `radius`; `StatTile` still takes no selection, for want of a screen that selects a tile.
