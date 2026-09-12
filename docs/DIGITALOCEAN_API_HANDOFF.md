# DigitalOcean API deployment handoff

The owner will deploy these changes. No DigitalOcean server was accessed or changed.

## What is ready

The API catalogue now serves the website's three source-authored papers:

| ID | Paper | Questions | Minutes | Correct / wrong |
| --- | --- | --- | --- | --- |
| `si-brolly-01` | SI Mock Test 01 | 200 | 190 | +1 / 0 |
| `si-brolly-02` | SI Mock Test 02 | 200 | 190 | +1 / 0 |
| `pc-constable-01` | Constable Mock Test 01 | 200 | 180 | +1 / 0 |

Text, options, answer keys, explanations, section ordering and practice patterns are
exported from `apps/web/lib/test-catalog.ts` and its existing paper sources. The
bank does not label the repeating demo questions as genuine previous-year papers.
The retired five-question API demo is omitted from the catalogue but retains its
old URL for compatibility. New results contain actual scores, not sample best scores.

`services/api/app/test_bank.json` is generated and committed. When changing papers:

```sh
pnpm install --frozen-lockfile
pnpm api:export-tests
pnpm api:check-tests
```

Commit the generated file together with its source changes and redeploy the API.
Validation rejects count/order/answer errors; CI rejects a stale generated bank.

## Deploy the repository stack

Use your normal reviewed code-delivery process to put the changed repository on
the Droplet. From the repository root, if you use its existing Docker Compose stack:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build api web
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

Keep the existing database volumes, environment settings and secrets. The checked-in
stack exposes Next.js on port 3201, with `API_INTERNAL_URL=http://api:8000` inside
the web container. Your HTTPS proxy should forward this site's requests, including
`/api/*`, to that Next.js service. Next.js removes `/api` before forwarding to
FastAPI. If you instead proxy `/api/*` directly to FastAPI, remove that prefix there
exactly once. Do not send `/api/v1/tests/catalog` unchanged to FastAPI; its route is
`/v1/tests/catalog`. No proxy configuration on the Droplet has been inspected.

## Verify before distributing the app

These public URLs must return JSON with HTTP 200, not the previous 404:

```sh
curl --fail https://mocktest.brollyexamprep.com/api/health
curl --fail https://mocktest.brollyexamprep.com/api/v1/tests/catalog
curl --fail https://mocktest.brollyexamprep.com/api/v1/content
curl --fail https://mocktest.brollyexamprep.com/api/v1/tests/pc-constable-01/paper
```

The catalogue must contain the three IDs above, each with 200 questions. Public
papers must not contain `correct_choice`, `correct_index` or `explanation`.
On a phone with Wi-Fi off, open version-code-2, refresh Tests, open SI Mock 02 and
Constable Mock 01, submit a test and inspect its results/solutions. Then verify
cached access offline. The existing SI Mock 01 local practice route is preserved
in version-code-2; the newly available SI Mock 02 and Constable paper use the API.

The current AAB is `artifacts/TelanganaPolicePrep-v1.0.0-vc2.aab`. It already includes
the public server URL and refresh fixes; these backend changes require no new AAB.

## Existing limits

This change delivers the existing question bank; it is not a database migration.
API users, sessions, attempts and results still live in process memory. Run a
single API worker for the present implementation; restarts clear that state.
Non-test notices/current affairs still use the existing sample content file.
The website keeps its existing local practice flows. Source-provided question
keys and existing practice cutoffs have been preserved, not independently audited.
