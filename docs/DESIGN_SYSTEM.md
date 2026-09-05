# TSLPRB design system — "hi-vis on tar"

Source of truth: `packages/design-tokens/src/tokens.ts` (Tailwind preset + TS object). This page explains intent.

## Identity
Industrial, high-contrast, no decoration that does not carry information. Hazard-stripe rail at the top of every screen, hi-vis yellow for the single primary action, hazard orange for "marked/attention", flag red for "wrong/critical". Sharp corners (2–4 px). Elevation by 1 px lines, never soft shadows. Kicker labels (10–11 px, letter-spaced, bold) introduce every block.

## Colour tokens
| Token | Hex | Role |
|---|---|---|
| `ink` | #0A0A0B | app background behind screens |
| `tar` | #0D0D0E | screen background |
| `panel` | #111214 | headers, footers |
| `panel2` | #141517 | cards, sheets, dialogs |
| `panel3` | #1E2023 | disabled fills, unvisited cells, progress track |
| `line` | #2C2E31 | primary borders |
| `line2` | #26282B | subtle dividers |
| `line3` | #3A3D41 | secondary button borders |
| `chalk` | #EDEBE3 | primary text |
| `chalk2` | #B9BBBF | body on dark cards |
| `dim` | #9A9CA0 | secondary text |
| `mute` | #6E7176 | decorative / non-text only (3.97:1) |
| `ghost` | #5A5D62 | disabled text |
| `hivis` | #FFE01B | primary action, answered, progress |
| `hivisHover` | #FFF06B | link hover |
| `hazard` | #FF8A00 | marked for review, warnings, step counters |
| `flag` | #E4483B | not answered, wrong, critical timer |
| `sand` | #B79A55 | offline/info accents, "why" label |
| `success` | #2C7A4B | accept call, correct (secondary) |
| `hivisTint` | rgba(255,224,27,.09) | selected card fill |
| `flagTint` | rgba(228,72,59,.08) | your-wrong-answer block |
| `hivisTint2` | rgba(255,224,27,.07) | correct-answer block |
| `offlineBg` / `offlineLine` / `offlineText` | #1B1808 / #4A421A / #D8D3BE | offline banner |

Contrast: chalk on tar 16.5:1, dim on tar 7.06:1 (kickers, captions), mute on tar 3.97:1 — below AA, reserved for non-text/decorative use (dividers, glyphs, disabled outlines), never for kickers or captions; tar on hivis 14.8:1.

## Type
| Language | Family | Body | Line-height | Tracking |
|---|---|---|---|---|
| en | Archivo 400/500/600/700 | 14.5 | 1.45 | kickers 1.6–2.4 px |
| te | Noto Sans Telugu 400–700 | 14.5 | 1.6–1.75 | 0 |

Two languages only since 2026-09-03 (F-26): the Urdu row (Noto Nastaliq Urdu, 2.05 line-height) was removed with the language. `useDir()` still resolves direction, currently always LTR.

Scale: kicker 10–11 · caption 11.5–12 · body 13–14.5 · question 16.5–17 · title 19–25 · score 58. Numbers always tabular, LTR.

## Spacing & shape
4-pt grid; screen padding 16; card padding 12–18; gaps 8–12. Half-steps `0.5`/`1.5` exist only for chip/tag padding (`LabelChip` `px-2 py-0.5`, `Chip size="md"` `py-1.5 px-4`) — never used elsewhere. Radii: 2 (chips, kickers), 3 (buttons, cells, inputs), 4 (cards). Touch targets 48 (secondary) / 56 (primary, keypad 58). Hazard rail 5 px `repeating-linear-gradient(115deg, hivis 0 14px, tar 14px 28px)`; turns flag red and animates when < 60 s remain.

## Components (apps/mobile/src/ui)
Screen · Text (kicker/title/body/num) · Button (primary hivis, secondary outlined line3, ghost, danger) · Card (selectable: 2 px hivis border + hivisTint) · Chip (tones hivis/hazard/flag/sand + `label`, the non-interactive quiet tag: `panel3` fill, no border, no yellow) · SegmentedChips (tone `hivis` for the header language switcher, `quiet` for a form picker's raised-panel selection; `block` fills the row with equal-share segments) · Sheet (gorhom, 3 px hivis top border) · Dialog (bottom card, 4 px hivis top border, kicker + title + body + stat tiles + stacked buttons) · Toast (full-width top banner, hazard/flag) · Banner (offline, sand) · Keypad (3×4, 58 px keys) · OtpCells (6, hivis border on current) · ProgressRail (6 px, 4 section ticks) · PaletteCell (nv/na/a/m/am + current outline + dot for a+m) · Row/Stack (direction-aware).

## Motion
Sheet 180 ms cubic-bezier(.2,.8,.3,1) from bottom; overlays fade 140 ms; toast 180 ms slide-down; hazard marquee 1.4 s linear loop. All disabled under reduced motion. Haptics: selection on option/keypad, success on submit, warning on 5-min/1-min toasts.

## Platform adaptation
Android (primary): edge-to-edge, ripple on pressables, predictive back handled in test (exit dialog). iOS: safe-area aware, SF Symbols where icons exist, sheet uses grabber, large-title header on Home/Library only. Identity (colours, rail, radii) identical on both.

## Ruling 2026-09-05 — hazard rail
The black/yellow hazard stripe is not rendered at the top of screens any more (user request). `HazardRail` survives as the attempt screen's critical-time warning (`Screen rail critical`), and in the dev gallery.
