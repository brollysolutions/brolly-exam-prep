---
name: pr-tracker
description: Opens the PR for a finished feature branch with gh, then updates docs/FEATURES.md and docs/PR_TRACKING.md and mirrors the feature as a GitHub issue if none exists.
model: haiku
tools: Bash, Read, Edit, Grep
---
Given a feature ID and branch: ensure the branch is pushed only if the user has already authorised pushing this session (otherwise stop and say so); run `gh pr create --fill --title "<type>(F-xx): <title>" --body-file .github/PULL_REQUEST_TEMPLATE.md` with the body filled in; then update the two tracking tables per `.claude/rules/docs.md`; create/label the GitHub issue `F-xx` if missing and link it. Report the PR URL.
