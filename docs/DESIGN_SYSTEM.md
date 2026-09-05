# TSLPRB design system — "Brolly on cream"

Source of truth: `packages/design-tokens/tokens.json` (Tailwind preset + TS object via `src/index.ts`). This page explains intent. Rebranded 2026-09-05 (F-28) to Brolly Solutions' identity; the spec is `docs/specs/2026-09-05-brolly-rebrand-design.md`.

## Identity
Warm and restrained: cream surfaces, charcoal ink, gold spent only where it means something. One ink-filled primary action per screen; gold marks what the candidate did (answered, selected, active filter, progress); ink marks a deliberate flag (marked for review); red is wrong / missing / critical; green is eligible / correct. Soft radii (6–12 px), 1 px hairlines for structure, warm ink shadows for elevation. Playfair Display carries titles and the wordmark; Inter carries everything else; Noto Sans Telugu carries Telugu. The umbrella lockup is the in-app brand mark; "TSLPRB" and "PWT" stay in copy as the exam's name.

## Colour tokens
| Token | Hex | Role | Contrast on canvas |
|---|---|---|---|
| `canvas` | #f7f2e6 | screen background | — |
| `surface` | #faf6ec | cards, bars, sheets, dialogs, inputs | — |
| `surface2` | #f0e9d8 | tiles, disabled fills, tracks, quiet selection, pressed fill | — |
| `line` | #e9e2d3 | card borders, hairlines | 1.2 (structure only) |
| `line2` | #ccc7bd | outlines that must read: secondary buttons, chips, inputs, the switcher | 1.5 (structure only) |
| `ink` | #211c17 | primary text, the primary fill, marked cells | 15.1 |
| `ink2` | #4a423a | body on cards, ghost buttons | 8.8 |
| `ink3` | #6f665b | captions, kickers, inactive labels — nothing smaller than `caption` | 5.0 |
| `ink4` | #989085 | decorative only: disabled text, muted chips, grabbers | 2.8 |
| `onInk` | #f7f2e6 | text on `ink` | 15.1 (on ink) |
| `accent` | #c29b38 | brand gold: fills only (answered cells, selected border, toggle on) | 2.3 — never text |
| `accentSoft` | #e8cf7a | soft gold fill: active chips, the switcher, the 5-minute toast | ink on it 11.0 |
| `accentStrong` | #a17f2a | non-text gold: rails, progress fill, focus borders, start edges | 3.4 |
| `accentInk` | #856a22 | the only gold text: kickers, counters, active tab, links | 4.6 (4.8 on surface) |
| `accentTint` | rgba(194,155,56,.14) | selected card fill, ripples | — |
| `ok` / `okInk` | #22c55e / #166534 | green fill / green text | ink on ok 7.4 / 6.4 |
| `danger` / `dangerInk` | #f87171 / #b91c1c | red fill (last-minute toast) / red text, outlines, critical rail | ink on danger 6.1 / 5.8 |
| `dangerTint` | rgba(185,28,28,.08) | wrong-answer block, danger chip fill | — |
| `navy` | #0a1e3a | the app icon tile only | — |
| `scrim` / `scrimHeavy` | ink at 45 % / 62 % | sheet / dialog backdrops | — |
| `pressTint` / `pressTintOnDark` | ink 10 % / cream 18 % | Android ripples on gold / on ink | — |

`packages/design-tokens/test/contrast.test.mjs` pins every pair above. Rules that follow from it: `accentInk` is the only gold text and only on `canvas`/`surface` (4.25 on `surface2`); `ink3` never below caption size; `ink4` never text; the timer's warning state (`accentSoft` + `accentInk`, 3.3) is large bold text and no smaller.

Legacy names (`tar`, `panel*`, `chalk*`, `dim`, `hivis`, `hazard`, `flag`, `sand`, …) survive as aliases in `tokens.json → legacyColors` so screens compile until Phase E renames them; `src/ui` may not use them (`test/legacy.test.mjs`). `hivis`/`hazard`/`sand` alias to `accentInk`, `flag` to `dangerInk`.

## Type
| Language | Text face | Display face (title, titleLg, display, wordmark) | Body | Line-height |
|---|---|---|---|---|
| en | Inter 400–800 | Playfair Display Regular + Italic, 1.2 line-height, −0.3 tracking | 13.5 | 1.5 |
| te | Noto Sans Telugu 400–800 | Noto 700 (800 on request) — Playfair has no Telugu | 13.5 | 1.65 |

`typography(lang, role, weight, { italic, numeric })` resolves the face; `<Num>` sets `numeric`, so digits stay tabular Inter at any size. Scale: kicker 10.5 (Telugu floor 12) · caption 11.5 · small 12.5 · body 13.5 · bodyLg 14.5 · question 16.5 · subtitle 19 · title 24 · titleLg 26 · display 30 · wordmark 17 / wordmarkSub 13 · score 58. Tracking: kicker 1.2, brand 2 (Latin only). Playfair is wider than Inter: every title gets a two-line allowance.

## Spacing & shape
4-pt grid; screen padding 16; card padding 12–16; gaps 8–12. Radii: `xs` 4 (tags), `sm` 6 (buttons, cells, inputs), `md` 8 (cards, toasts), `lg` 12 (dialogs), `xl` 16 (sheet top corners), `full` (pills, toggle). Shadows are warm ink: `card` (`0 6px 20px -12px` at 25 %) under cards, `raised` under toasts, `sheet` (cast upward) under dialogs and sheets; `shadowStyle(name)` returns the `boxShadow` object. Touch targets 48 (secondary) / 56 (primary, keypad 58). The brand rule (`Rail`) is 3 px solid gold; red and pulsing while the attempt clock is critical.

## Components (apps/mobile/src/ui)
Brand (umbrella + live Playfair wordmark; `splash` = the full logo) · Screen (`canvas`, optional `Rail`) · Text (ink; `italic` for the display face) · Button (`primary` ink fill, `secondary` line2 outline, `ghost`, `danger` red outline, `accent` gold outline that fills when active) · Card (surface, hairline, card shadow, `trailing` slot, `flat`; selected = 2 px gold + tint, title stays ink) · Chip (`accent` soft gold, `danger` red tint, `ok` green, `label` the quiet surface2 tag) · SegmentedChips (`accent` for the header switcher, `quiet` for form pickers) · Kicker (ink3, `accentInk` counters) · Sheet (surface, xl corners, 3 px gold edge, line2 grabber) · Dialog (surface, lg corners, 3 px gold edge, surface2 stat tiles) · Toast (floating, `accent` / `danger` / `info` = ink) · Banner (surface2) · Keypad / OtpCells / PhoneField (surface boxes, line2 idle, accentStrong focus) · ProgressRail (surface2 track, gold or red fill) · PaletteCell (plain unvisited · red outline unanswered · gold answered · ink marked · gold dot in a cream ring for both · 2 px ink ring with a 2 px gap for the current one) · Toggle (round: gold/ink on, surface2/line2/ink3 off) · Row/Stack (direction-aware) · Num/Glyph/Measure/Duration.

Pressed feedback on cream is a `surface2` fill (`pressedClass`), never opacity — opacity is invisible between two creams. Filled controls (ink, gold) dim to 85 % instead (`pressedStyle`). A resting fill and the pressed fill share one class slot so two `bg-*` utilities never compete.

## Status vocabulary
Gold = the candidate's own input or the active state · ink = a deliberate flag (marked) · red = wrong, unanswered, critical · green = eligible, correct (text `okInk`). Timer: normal `surface2`/ink, ≤ 5 min `accentSoft` fill + `accentInk` digits, ≤ 60 s solid `dangerInk` with `onInk` digits — never `danger` with cream text (2.5:1). Exactly one gold-edged card per screen (the hero, the worked example, the score).

## Motion
Sheet 180 ms cubic-bezier(.2,.8,.3,1) from bottom; overlays fade 140 ms; toast 180 ms slide-down; the critical rail pulses opacity over 700 ms. All reduce to instant changes (the rail to a static red rule) under reduced motion. Haptics: selection on option/keypad, success on submit, warning on the 5-min/1-min toasts.

## Platform adaptation
Android (primary): edge-to-edge, gold-tinted ripples, predictive back handled in test (exit dialog), adaptive icon = gold "B" on navy. iOS: safe-area aware, sheet grabber, the same 1024 mark. Web: `boxShadow` renders as CSS; `?lang=` overrides the stored language for captures. Identity identical on all three.

## Rulings
- 2026-09-05 — Brolly rebrand (F-28): light cream theme, ink primaries, gold accents, Inter + Playfair; the hi-vis / hazard identity is retired. Tokens shaped so a dark palette can be added later.
- 2026-09-05 — No rail as screen chrome; `Rail` survives as the attempt screen's critical-time warning and in the dev gallery (Phase D replaces it with a static red band).
- Palette semantics differ from CBT conventions (green/red/purple) on purpose: the legend with counts explains them in place, and a re-tune is a token edit.
