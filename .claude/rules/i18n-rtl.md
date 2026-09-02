---
paths:
  - "apps/mobile/**"
  - "packages/i18n/**"
  - "packages/fixtures/**"
---
# i18n + RTL rules (auto-loaded)

- Every user-visible string goes through `t('key')` from `@tslprb/i18n`. Keys are added to `en.json`, `te.json`, `ur.json` in the same commit; a missing key in any language fails `pnpm test` (parity test).
- Fonts: `Archivo` (en), `NotoSansTelugu` (te), `NotoNastaliqUrdu` (ur). Use `useTypography()`; never set `fontFamily` directly.
- Line-height: en ≥ 1.45, te ≥ 1.6, ur ≥ 2.0. Urdu body size is 1–2 px larger than English.
- Direction: `const d = useDir()` → `d.isRTL`, `d.row` (flexDirection), `d.textAlign`, `d.chevronNext/Prev`. Tailwind: `dir('ml-2','mr-2')`. Never use RN `start/end` style props or `I18nManager` — they don't follow the in-app language.
- Numbers, phone numbers, timers, scores: wrap in `<Num>` (forced LTR, tabular). Mixed strings use `⁨…⁩` isolation.
- Letter-spacing/tracking only for `en`; Telugu and Urdu get `0`.
- Every screen has a snapshot test rendered with `lang: 'ur'` and one assertion that the primary `Row` is `row-reverse`.
- Before PR: run `@i18n-rtl-reviewer`.
