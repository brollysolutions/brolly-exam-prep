# Application audit and fixes — 11 September 2026

The audit covers the Expo mobile app, Next.js website, shared contracts and translations,
FastAPI routes, PostgreSQL persistence, browser offline support, and local deployment.
Fixes were authorized together with the review. The pre-existing untracked `deploy.sh`
was left unchanged. No commit, push, remote deployment, or signed AAB was produced.

## Findings and changes

| ID | Priority | Finding and trigger | Implemented change |
| --- | --- | --- | --- |
| A01 | High | Opening a different mobile test while one was running silently replaced its answers and timer. | Show a conflict screen with Resume test and Back. Do not load/create the other attempt. Ignore delayed start responses after the active attempt changes. |
| A02 | High | Reopening a submitted mobile test automatically started another attempt. | Redirect to the existing result; offer an explicit Practise again action after a result loads. Retaking keeps the previous completed result. |
| A03 | High | Mobile answer/clear/review writes remained possible after the deadline, before the timer callback ran. | Enforce the deadline in the store. A submit at or beyond the deadline becomes an automatic submission. |
| A04 | High | A mobile connectivity change refetched the global catalogue; a failed request replaced the running exam with a load-error screen. | Keep the initialized app mounted. Retry pending submissions on reconnect and foreground; retry initial loading without rebuilding an active catalogue. Website startup also recovers on an online event. |
| A05 | High | Native SQLite failures silently switched all keys to an incomplete memory map, losing previously read values and preventing recovery. | Cache successful reads, retain pending writes/deletions, and retry them. A bilingual, scrollable storage warning appears above the app, including the initial loading screen. The storage probe participates in device wiping. |
| A06 | Medium | Non-imported mobile tests displayed static sample cost analysis alongside real server scores. | All result routes display actual server answer counts and complete question review. Demo provenance remains visible. |
| A07 | Medium | API request timeout stopped at response headers. A stalled body could leave loading/submission pending indefinitely; body network failures bypassed offline cache recovery. | Keep the deadline active through JSON download. Recover downloaded data for connection failures; invalid JSON/schema responses remain explicit errors. Applied to web and mobile. |
| A08 | High | Signing out during submission could still start later result/solution downloads, which used the new cache epoch and repopulated cleared storage. | Check that the pending job still exists after each asynchronous stage, before starting the next download. |
| A09 | High | Delayed result recovery could map an old paper onto a different, newly submitted attempt. | Recheck attempt/test identity after loading the paper and before freezing a submission. Website submitted attempts also reload the original server snapshot. |
| A10 | Medium | Question review times were always zero; delayed submission recovery recalculated elapsed time from retry time. | Accumulate question time across visits and persist submission time. Cap time at the deadline and include real question times in final submission snapshots. |
| A11 | Medium | The Next.js proxy rejected OpenAPI requests; the review-paper schema incorrectly made solutions optional. | Add `/openapi.json` and `/api/openapi.json`, with public schema `servers: [{url: '/api'}]`. Make reviewed answers/explanations required; regenerate OpenAPI and TypeScript contracts. |
| A12 | Medium | Phone sign-in accepted letters/spaces. Numeric coercion accepted boolean answer choices and infinite timing values that could break persistence/JSON responses. | Match phone syntax in Pydantic/Zod, require integer choices in range, reject non-finite timing, and return JSON-safe 422 validation responses. |
| A13 | Medium | A browser Cache Storage quota/open failure rejected otherwise successful online page and asset requests. | Make cache reads/writes optional around real network responses. Exclude `/api`, its children, and the root schema from navigation caching. Preserve the current cache namespace during update. |
| A14 | Medium | Production Compose inherited the development API autoreloader. | Production startup runs migrations and Uvicorn without `--reload`. |
| A15 | Critical; external | Public `/api/health`, `/api/v1/tests/catalog`, and `/api/openapi.json` returned 404 during this audit. | Local code and routes are fixed. The remote source/proxy must be deployed and verified using access to the actual host. Local Docker changes do not change that host. |

## Review coverage

| Area | Evidence in this audit | Limits |
| --- | --- | --- |
| Welcome, phone sign-in, post/category, Home, Tests, Study/topic, news, Eligibility, Profile | Route/source review and existing English/Telugu component, navigation, validation, and persistence tests | No new browser walkthrough or device screenshots |
| Attempt, timer, palette, dialogs, submission, result, solutions | New regression tests plus existing component/store coverage; HTTP exercise of real server attempts and scoring | Native hardware Back, TalkBack/VoiceOver and large-text layout require devices |
| Typography, colors, spacing, controls, empty/loading/error states | Existing design system and component review; shared contrast/scale tests; new warnings reuse native tokens/primitives | Visual hierarchy, alignment, responsiveness and motion are not freshly visually certified. Light theme is the configured product; dark mode is not a requirement. |
| Server data and contracts | Catalogue/paper/content validation, real PostgreSQL tests, OpenAPI generation, proxy checks, full-paper smoke script | Anonymous practice uses unguessable attempt IDs; phone sign-in deliberately does not prove identity |
| Offline and device clearing | Body-failure/timeout recovery, submission identity/cancellation, storage retry, service-worker quota tests | First download/result still requires a connection. Device wipe does not delete anonymous server records. |
| Delivery | Production Next.js/Docker build and Android JavaScript export | JavaScript export is not a signed AAB; previous signing certificate/package identity were not available for verification |

The browser skill initialized, but discovery returned no available browser. No substitute
browser automation was used. A numerical visual-quality score would not be supported by
this session's evidence. The UI changes prioritize visible status, recovery and explicit
user control; no aesthetic redesign or token change was made.

## Validation

- Mobile: **947 tests in 103 suites passed; all 15 snapshots passed**. Final log:
  [mobile tests](../.playwright-mcp/audit-2026-09-11-mobile-final.log).
- Website: **38 tests passed**, including streaming-body timeouts, cache quota failures,
  delayed recovery, submission timing, and cancellation after sign-out.
  [web tests](../.playwright-mcp/audit-2026-09-11-web.log).
- Backend: **23 tests passed** against PostgreSQL. Ruff passed; `alembic check`
  reported no new upgrade operations.
- Shared packages: **45 design-token tests and 4 English/Telugu parity tests passed**.
- Workspace TypeScript checks passed. Both apps passed final ESLint checks.
  [type checks](../.playwright-mcp/audit-2026-09-11-typecheck.log),
  [lint](../.playwright-mcp/audit-2026-09-11-lint-final.log).
- Production Docker rebuild of API/web succeeded. Both containers are healthy.
  [build log](../.playwright-mcp/server-api-compose-build.log).
- Real HTTP smoke check through `http://localhost:3201/api` loaded all **7 tests /
  1,240 questions**, validated content, and exercised start, answer save, submission,
  persisted result and complete solutions for all three full imported papers. Solutions
  were unavailable before submission, and duplicate submission returned the same result.
- `http://localhost:3201/openapi.json` and `/api/openapi.json` each returned **200**,
  with **17 API paths** and the correct `/api` server base.
- Android JavaScript export generated successfully with source maps for inspection.
  The source map includes only `packages/fixtures/src/runtime.ts` from the fixtures
  package; no authored question banks or MockApi enter the release dependency graph.
  This inspection export disables bytecode; it is not the Play Store AAB.
- `git diff --check` passed. No live browser/device accessibility certification is claimed.

The four original regression failures (attempt replacement, submitted re-entry,
deadline writes and catalogue unmounting) were reproduced before their fixes. See
[the failing baseline](../.playwright-mcp/audit-2026-09-11-regressions-before.log).
New tests initially caught a missing storage-probe entry in device wiping; the registry
and wipe implementation were corrected before the final suite passed.

Key implementation evidence: [mobile attempt entry](../apps/mobile/src/features/attempt/TestAttemptScreen.tsx),
[mobile catalogue gate](../apps/mobile/src/features/shell/CatalogGate.tsx),
[recoverable storage](../apps/mobile/src/data/storage.ts),
[submission queue](../apps/web/data/complete.ts),
[API proxy](../apps/web/app/api/%5B...path%5D/route.ts),
[API validation](../services/api/app/schemas.py),
[browser cache handling](../apps/web/public/sw.js).

## Deployment handoff

Configured production API base: `https://mocktest.brollyexamprep.com/api`.
After deployment, the schema is intended to be available at
`https://mocktest.brollyexamprep.com/openapi.json` and
`https://mocktest.brollyexamprep.com/api/openapi.json`.
These are **not verified working production URLs** in this audit.
See [SERVER_API.md](SERVER_API.md) for endpoint and deployment instructions.

The current public 404 does not identify which remote proxy produced it. Inspect the
actual host's checked-out source, Compose services and TLS routing before changing
configuration. SSH host/alias, username and project directory remain necessary to
finish that deployment. Do not share passwords or private signing keys in chat.
