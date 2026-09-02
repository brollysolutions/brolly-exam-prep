---
paths:
  - "docs/**"
---
# Docs rules (auto-loaded)

- `docs/FEATURES.md` row format: `| F-xx | Feature | Screens/route | Status | PR | Agent | Notes |`. Status ∈ todo, in-progress, review, done, parked.
- `docs/PR_TRACKING.md` row format: `| #n | branch | F-ids | opened (YYYY-MM-DD) | review | merged | notes |`. The `track-pr` hook upserts rows; keep the table sorted by PR number.
- `docs/IMPLEMENTATION_PLAN.md` is a live checklist: tick items as they land, add a dated note for any ruling that deviates from the plan.
- Specs go in `docs/specs/YYYY-MM-DD-topic-design.md`.
