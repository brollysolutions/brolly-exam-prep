---
paths:
  - "apps/mobile/**"
  - "packages/i18n/**"
  - "packages/fixtures/**"
---
# i18n + RTL rules (auto-loaded)

- Two languages: English (default) and Telugu. Urdu was removed at the user's request on 2026-09-03 (F-26); do not add a third language or any `ur` key, font or branch.
- Every user-visible string goes through `t('key')` from `@tslprb/i18n`. Keys are added to `en.json` and `te.json` in the same commit; a key present in one language only fails `pnpm test` (parity test).
- Fonts: `Archivo` (en), `NotoSansTelugu` (te). Use `useTypography()`; never set `fontFamily` directly.
- Line-height: en ≥ 1.45, te ≥ 1.6.
- Direction: `const d = useDir()` → `d.isRTL`, `d.row` (flexDirection), `d.textAlign`, `d.chevronNext/Prev`. Tailwind: `dir('ml-2','mr-2')`. Never use RN `start/end` style props or `I18nManager` — they don't follow the in-app language. RTL is currently dormant (both languages are LTR, `isRTL()` is always false); keep routing anything directional through these helpers so an RTL language can be added without touching screens.
- Numbers, phone numbers, timers, scores: wrap in `<Num>` (forced LTR, tabular). Mixed strings use `⁨…⁩` isolation.
- Letter-spacing/tracking only for `en`; Telugu gets `0`.
- Every screen has a snapshot test rendered with `lang: 'te'` (a `*.te.test.tsx`) that asserts Telugu copy is on screen in the `NotoSansTelugu` face. No `row-reverse` assertions: nothing can mirror while RTL is dormant.
- Before PR: run `@i18n-rtl-reviewer`.
- Glyph characters (chevrons `‹ ›`, `✕ ✓ ⌫ ■ ⛌`, rings) must render in the Latin face: use the shared `Glyph`/`Chevron` helper or `lang="en"` on the `Text`, so a symbol never depends on the language face carrying the glyph.
