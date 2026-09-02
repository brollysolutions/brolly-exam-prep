# PR tracking

Rows are upserted automatically by `.claude/hooks/track-pr.mjs` whenever `gh pr create` or `gh pr merge` runs in a Claude Code session, and by `@pr-tracker`. Keep sorted by PR number. `review` = result of the Claude PR-review GitHub Action (pending / approved / changes-requested).

| PR | Branch | Features | Opened | Review | Merged | Notes |
|---|---|---|---|---|---|---|
