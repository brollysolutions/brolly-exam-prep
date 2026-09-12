# Android release status — 2026-09-12

Version 1.0.0, Android version code 2, package `com.telanganapoliceexampreparation.app`.

The new bundle was built successfully (including Android release lint) at `artifacts/TelanganaPolicePrep-v1.0.0-vc2.aab`. Inspection of its compiled JavaScript confirms the public API URL is present, `http://192.168.0.120:8000` is absent, and the new refresh control is included. Embedded app configuration confirms version code 2. Runtime source in the prepared native build matches the workspace, allowing for line endings.

## App corrections

- Release HTTP clients default to the public HTTPS API regardless of `.env.local`.
- The Tests tab requests a fresh catalogue on focus and supports pull-to-refresh, including empty and failed lists.
- Existing cache-first reads and offline fallback are preserved. Attempt timing, answer saving and submission are unchanged.
- `apps/mobile/scripts/rebuild-release.ps1` rebuilds using the prepared native project under `C:\dev\brolly-exam-prep`, backs up the files it replaces, disables dotenv for bundling and writes a new AAB to `artifacts/`. The desktop version-code-1 bundle is untouched.

## Production blocker

Public GET requests on 2026-09-12 returned HTTP 404 for:

- `https://mocktest.brollyexamprep.com/api/health`
- `https://mocktest.brollyexamprep.com/api/v1/tests/catalog`
- `https://mocktest.brollyexamprep.com/api/v1/tests`
- `https://mocktest.brollyexamprep.com/api/v1/content`

Root-level `/health` and `/v1/tests/catalog` also returned 404. The local Next.js proxy already forwards these `/api` routes to FastAPI, so the live deployment must be identified and inspected before changing server routing.

The backend development fix now serves the existing SI Mock 01, SI Mock 02 and Constable Mock 01 papers (600 questions) from the generated `services/api/app/test_bank.json`, replacing the demo in the public catalogue. Question/section counts, bilingual copy, answer keys and marking rules are preserved from the existing website sources.

The owner confirmed DigitalOcean hosting and will handle deployment. No live server changes were performed. Follow [the deployment handoff](DIGITALOCEAN_API_HANDOFF.md) to deploy the API/web and verify routing. The version-code-2 AAB already supports the added API catalogue entries; another build is not needed for these backend changes. Its pre-existing local SI Mock 01 practice route is preserved.

Do not treat this artifact as production-ready until the deployed endpoints and test content are verified and the app is tested over mobile data. Server sessions/attempts/results remain in memory, and non-test feeds retain their existing sample content.

## Validation

Mobile typecheck passed. ESLint passed with one existing unused `View` warning in `WelcomeView.tsx`. The targeted API, cache, refresh-route and library-view tests passed (52 tests across five suites, including the Telugu snapshot). The snapshot change is the new vertical-bounce property that enables refreshing short lists.

Backend: 29 tests passed, including the complete attempt/score/review flow for each 200-question paper, public answer-key filtering and rejection of answers belonging to another paper. Ruff passed. `pnpm api:check-tests` verified source parity and mobile API contracts for all 600 questions. The AAB signature was verified and its certificate SHA-256 matches the original version-code-1 bundle.
