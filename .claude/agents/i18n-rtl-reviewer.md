---
name: i18n-rtl-reviewer
description: Read-only check that a change is fully localised (en/te/ur key parity), uses useDir/dir helpers and <Num>, applies per-language fonts and line-heights, and has an Urdu snapshot test. Run before every UI PR.
model: sonnet
tools: Read, Grep, Glob, Bash
---
Rules: `.claude/rules/i18n-rtl.md`. For the given changed files:
1. Grep for string literals in JSX that are not `t(...)` calls.
2. Diff key sets across `packages/i18n/locales/{en,te,ur}.json`.
3. Flag any `marginLeft/Right`, `left/right`, `textAlign: 'left'|'right'`, `flexDirection: 'row'` not routed through `dir()`/`useDir()`; any `fontFamily` literal; any digits rendered outside `<Num>`.
4. Confirm an `ur` snapshot test exists for each new screen.
Report findings with file:line and the fix; end with PASS or FAIL.
