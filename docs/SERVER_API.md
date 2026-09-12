# Server-backed app data

The mobile release and website load all authored content from FastAPI. Client bundles
contain UI, translations, types and calculation helpers; they do not contain the test
catalogue, question/answer banks, study notes, notices, affairs or eligibility tables.
`packages/fixtures/src/runtime.ts` is populated before screens mount.

Public origin: `https://mocktest.brollyexamprep.com/api`. Local Compose origin:
`http://localhost:3201/api`. Direct local API: `http://localhost:8200`.

## Endpoints

All paths below are relative to the API origin. JSON request bodies use
`Content-Type: application/json`. IDs must be URL-encoded.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Health status |
| GET | `/v1/content` | Study sections, notices, affairs, exam info, category cutoffs, default patterns, physical standards |
| GET | `/v1/tests` | Legacy summary contract for the complete catalogue |
| GET | `/v1/tests/catalog` | Bilingual titles, full patterns, section order/locks, free/listed/demo flags |
| GET | `/v1/tests/{test_id}/meta` | One catalogue entry |
| GET | `/v1/tests/{test_id}/paper` | Complete bilingual paper; practice answer keys omitted |
| GET | `/v1/tests/{test_id}` | Legacy sections/questions contract; keys omitted |
| POST | `/v1/attempts` | Start: `{"test_id":"si-brolly-02"}`; returns `id`, `started_at`, `ends_at`, `status` |
| GET | `/v1/attempts/{id}` | Persisted attempt status |
| GET | `/v1/attempts/{id}/meta` | Pattern snapshot for this attempt |
| GET | `/v1/attempts/{id}/paper` | Paper snapshot for this attempt, without practice keys |
| PATCH | `/v1/attempts/{id}/answers` | Save: `{"question_id":"...","choice":0,"marked":false,"seconds":12}` |
| POST | `/v1/attempts/{id}/submit` | Submit optional final snapshot; returns `result_id` |
| GET | `/v1/results/{result_id}` | Summary, section scores, wrong/skipped explanations |
| GET | `/v1/results/{result_id}/detail` | Actual score, counts, per-question review and timing |
| GET | `/v1/results/{result_id}/paper` | Complete solutions for the submitted snapshot |
| POST | `/v1/auth/phone` | Existing phone-only mobile sign-in; website remains anonymous |

`GET /api` on the website also returns health. API errors and status codes pass
through the Next.js proxy, including 404 for missing resources and 409 before submission.
The complete schema is in `services/api/openapi.json`. The website exposes
`/openapi.json` and `/api/openapi.json`, with `/api` as the schema's server base.
These public routes require deployment of the updated website. Swagger runs at
`http://localhost:8200/docs` when the local API is up.

## Data and submission behavior

- Ten catalogue entries include the existing IDs (including retired/hidden demo
  entries), `pc-constable-02`, `si-brolly-03` and `pc-constable-03`; the six complete imported papers
  have 200 questions each. The catalogue contains 1,840 questions in total. Existing
  demo labels and verification flags remain. Source reviews are in
  `CONSTABLE_MOCK_02.md`, `SI_MOCK_03.md` and `CONSTABLE_MOCK_03.md`.
- Previous-year reading papers include their solutions. Practice solutions require a
  submitted result ID. Missing results never produce sample analysis.
- Attempts, answer snapshots and results persist in PostgreSQL's `practice_attempts`
  table (migration `0002_practice_attempts`). Retrying submission returns the same
  immutable result. Later content updates do not change an existing attempt's paper.
- Anonymous attempt IDs are unguessable capabilities. There is no public attempt/result
  enumeration endpoint. Phone sign-in does not establish ownership of these records.
- Public metadata and papers are cached only after an actual successful API download.
  Network/5xx failures can use that cache; 404, 403 and invalid payloads cannot.
- Answers and deadlines remain on the device during offline practice. Final submission
  snapshots remain in a persisted retry queue until the server confirms the result.
  Results need a connection the first time. Boot, reconnect and result Retry flush the queue.
- This is offline-capable practice: a final answer snapshot may be submitted after the
  deadline and is marked `auto_submitted`. It is not a proctored-exam anti-cheat protocol.
- Device sign-out clears local progress, pending jobs and downloaded API cache. It does
  not delete server records. Previously locally scored results have no server result ID;
  they cannot acquire server solutions retroactively without a submitted answer snapshot.
- Mobile storage failures show a warning and allow retrying pending writes. Question
  times and submission time are persisted; retrying a result does not add waiting time
  to the completed attempt. Opening a second mobile test preserves the running attempt.

## Updating content

Authoring files stay in the repository for source imports and tests. They are not imported
by release screens. After editing them, export and deploy the backend dataset:

```powershell
pnpm --filter web exec tsx scripts/export-api-catalog.ts
services/api/.venv/Scripts/python.exe services/api/scripts/export_openapi.py
pnpm contracts:gen
```

Commit `services/api/app/content/*.json` with the authored changes. New server content
is downloaded on the next app launch, without rebuilding the mobile app.
For schema changes keep Pydantic and Zod models in sync before generating OpenAPI types.

## Deploying and resolving public 404s

The backend now accepts both canonical `/v1/...` routes and `/api/v1/...`
aliases using the same handlers, dependencies and response models. This supports
Next.js stripping `/api` as well as a legacy Nginx proxy forwarding `/api` directly
to FastAPI. `/api`, `/api/health` and `/api/openapi.json` also work directly on the
backend. OpenAPI contains only canonical paths and its public schema uses `/api`
as the server base, so generated clients do not repeat the prefix.

The checked-in `deploy.sh` now resolves its own repository directory, uses
`git pull --ff-only`, applies the production Compose overlay without a preceding
stack shutdown, and checks real content/catalogue responses inside the API plus
public health/content/catalogue/schema endpoints. It exits with an error if public
requests still fail. Set `PUBLIC_API_BASE_URL` only to target a different deployment.
Run it on the server after these code changes have reached its Git remote.

The changes must be present on the server, then run from its repository directory:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build api web worker
curl --fail https://mocktest.brollyexamprep.com/api/health
curl --fail https://mocktest.brollyexamprep.com/api/v1/tests/catalog
curl --fail https://mocktest.brollyexamprep.com/api/v1/content
curl --fail https://mocktest.brollyexamprep.com/openapi.json
```

Compose runs Alembic before starting the API. Keep the PostgreSQL volume; do not run
`down -v`. Rebuild both the API and website so their schemas and proxy allowlist agree.
The production overlay disables the development API autoreloader.

The public TLS proxy must forward the website origin (including `/api/...`) to
`http://127.0.0.1:3201` **without stripping `/api`**. Next.js strips that prefix while
forwarding to `http://api:8000`. Remove conflicting old `/api` locations if present.
For Caddy the complete site rule is:

```caddy
mocktest.brollyexamprep.com {
    reverse_proxy 127.0.0.1:3201
}
```

For an existing host Nginx HTTPS site, the ready-to-include API locations are in
[`deploy/nginx/mocktest-api.locations.conf`](../deploy/nginx/mocktest-api.locations.conf).
First check on the public server that `curl --fail http://127.0.0.1:3201/api/v1/content`
works. Back up that site's configuration, replace its conflicting `/api` location
blocks with the supplied locations (or include the file inside that site's HTTPS
`server` block), then run `sudo nginx -t` before `sudo systemctl reload nginx`.
Keep existing certificate, domain and non-API settings. The sample assumes the
default web port 3201; adjust it only if that host uses another web port.

The `proxy_pass` URL intentionally has no trailing slash, preserving `/api/...`
for Next.js. Do not point these locations at port 8200 with the `/api` prefix
still attached. See [Nginx proxy_pass semantics](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

On 12 September 2026 the local web `/api/v1/content` and direct backend `/v1/content`
returned 200. Public `/openapi.json` returned the current schema (including
`/v1/content`), while `/api/v1/content`, `/api/health` and `/api/v1/tests/catalog`
returned JSON 404s. This suggests a conflicting public API proxy rule or upstream;
the actual host configuration still needs inspection to establish the exact cause.

The supplied Nginx locations passed `nginx -t` and an isolated local proxy check:
`/api`, `/api/health`, `/api/v1/content`, `/api/v1/tests/catalog` and
`/api/openapi.json` all returned 200 and matched direct Next.js JSON responses.
An unknown API path still returned 404. The test used Docker Desktop's host
gateway in place of loopback for the same port 3201; its temporary container was
stopped afterward. This verifies the proposed configuration, not the live server.

After adding backend prefix compatibility, all 35 API tests and targeted Ruff
checks passed. OpenAPI and TypeScript contracts were regenerated with no changes
to their output. An isolated Nginx check exercised both Next.js upstream routing
and direct FastAPI routing with the prefix preserved: health, content, catalogue,
SI03 paper and schema returned identical HTTP 200 JSON in both modes. `sh -n`
passed for `deploy.sh`; its deployment/pull operations were not executed locally.
The live content endpoint remained 404 because the new backend code has not been
deployed on that server. No server SSH connection is configured in this workspace.

A public 404 does not establish which proxy produced it. Compare direct backend
`http://127.0.0.1:8200/health`, local website `/api/health`, and public `/api/health`
on the actual host before changing its TLS configuration. Server access is needed
to identify and repair the public deployment; local passing checks alone do not do that.

For mobile, set `EXPO_PUBLIC_API_URL=https://mocktest.brollyexamprep.com/api` at build
time (also the code default). No mock-mode toggle is required. For LAN development,
use your computer's LAN address and port, not the phone's `localhost`.

## Verification

```powershell
docker compose exec -T api pytest -q
docker compose exec -T api ruff check .
pnpm --filter web test
pnpm --filter mobile test -- --runInBand
pnpm typecheck
pnpm lint
# Real HTTP end-to-end check. Creates practice attempts; defaults to localhost:3202/api.
$env:API_BASE_URL = 'http://localhost:3201/api'
pnpm --filter web exec tsx scripts/smoke-api.ts
```
