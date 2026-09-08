# Next.js website migration

Implemented on branch `web`. The Docker `web` service now builds `apps/web` and
runs Next.js 15 on Node 22 at the existing host port 3201. No mobile source,
backend source, shared fixture, or shared translation was changed. Nothing was
pushed or merged to `main`.

Mobile dependency versions remain unchanged. The shared lockfile gains website
dependencies and pnpm peer-resolution metadata for the website's `tsx` test
runner (including Tailwind 3's optional peer); no mobile package manifest changed.

## Architecture

The website uses TypeScript, React, Next.js App Router, native HTML controls,
Tailwind 4, and the configured shadcn Button. Next.js is the framework;
TypeScript is the frontend programming language. Shared Brolly design tokens,
English/Telugu translations, and licensed existing fonts are reused.

Next owns each public route and a server-side `/api` proxy. Persisted interactive
screens load through a browser-only boundary to keep browser account state out
of server-rendered HTML and avoid sharing Zustand user state across requests.
Consequently, prerendered page bodies contain a bilingual loading shell; this
migration does not add server-rendered study content for search engines.

The proxy forwards approved API paths and bearer authorization to
`API_INTERNAL_URL`, defaulting to `http://127.0.0.1:8200` locally and
`http://api:8000` in Docker. It does not cache API responses or expose arbitrary
upstream URLs. The production image uses Next's standalone output and a
non-root runtime user.

## Routes

| URL | Screen |
| --- | --- |
| `/` | Home and local progress |
| `/tests` | Test catalogue and SI/PC/full/previous filters |
| `/login`, `/welcome`, `/post`, `/category` | Phone sign-in and onboarding |
| `/tests/simocktest` | Imported 200-question SI practice paper |
| `/test/[id]` | Other existing practice papers |
| `/test/[id]/result`, `/test/[id]/solutions` | Saved result and explanations |
| `/paper/[id]` | Previous-paper reader |
| `/study`, `/study/[topic]` | Study catalogue, content, and read marks |
| `/profile` | Preferences, practice history, sign-out, local-data wipe |
| `/updates`, `/affairs` | Existing sample notices and current affairs |
| `/eligibility` | Existing PMT/PET checker and its source caveats |

The SI result/solutions slug remains `simocktest`. Legacy route-group links
`/(tabs)`, `/(auth)`, and `/(onboarding)` redirect to equivalent flat routes.
Login return destinations are restricted to this origin.

## Persistence and offline behavior

Website stores retain the Expo web `tslprb.*` localStorage keys and data shapes.
Keeping the same browser origin preserves existing sessions, attempts, language,
study progress, and results. A different hostname or port has separate storage.
Private mode or blocked/full storage can degrade to memory-only operation.

The exam resumes its original timestamp deadline and saved answers after reload.
Answers cannot change after expiry; expiry submits once the paper has loaded.
Section unlocks and answer/mark palette states retain the original rules.
Completed attempts are scored locally, and repeated completion is idempotent.
Results do not invent ranks. Sign-out clears personal preparation data; the
explicit browser-data wipe also removes welcome and language preferences.

In production, a service worker caches public shells, scripts, styles, and
English/Telugu fonts. It warms the main routes and caches visited pages. After
the initial online cache completes, an open exam can be reloaded and submitted
offline, with results and explanations saved in the browser. Unvisited uncached
pages show an offline recovery screen. Initial login still requires the API.
Service workers require HTTPS or localhost and are disabled in development.

API answer/submission synchronization is best effort, with sequential updates
and a final snapshot. There is no durable retry queue or cross-device sync.
Avoid simultaneous edits to the same attempt in multiple tabs. Browser storage
and bearer tokens are not stored in the service-worker cache.

## Existing content and backend boundaries

Phone sign-in uses the existing `/v1/auth/phone` endpoint; this migration does
not introduce SMS/OTP verification. Tests and question papers still use the
shared fixture bank because the backend does not serve the complete bilingual
paper/pattern contract. The imported SI paper retains its supplied questions;
other fixture papers retain their demonstration question bank. Some fixture
IDs do not exist on the backend, so those attempts start and score locally.

Updates and recruitment dates remain explicitly labeled sample data. Eligibility
standards keep their existing source/verification notices. This migration does
not validate or update recruitment rules. The reminder toggle saves a
preference; browser notifications are not scheduled. Payments are not added.

## Maintaining the domain logic

`docs/web-migration.sources.json` records the original mobile-source hashes for
the browser-compatible stores, scorer, API adapter, and evaluators copied into
`apps/web`. The website uses its own storage and i18n adapters and adds deadline
write protection and completion handling. Future marking, storage, or eligibility
changes should be applied consistently to both apps, or moved to a shared
platform-neutral package in a separate refactor.

## Verification

Run `pnpm --filter web test`, `lint`, `typecheck`, and `build`. The regression suite
covers legacy storage recovery, deadline enforcement, section locks, idempotent
completion, paper identity, sign-out/wipe behavior, and safe return URLs.
Docker builds also perform the production compile and TypeScript validation.

Verified locally on 2026-09-08: seven regression tests, ESLint, TypeScript, and
the standalone Docker production build passed. Browser checks covered phone
sign-in/onboarding, answer recovery with an unchanged deadline, Telugu switching,
mobile question navigation, submission and retakes, study read persistence,
previous-paper pagination, and eligibility rendering. At 390px and 1280px there
was no horizontal overflow in the checked screens. An isolated browser with its
network disabled reloaded an exam, retained its answer/deadline, submitted, and
opened a dedicated solutions page. The Next API health proxy returned 200 and
an unapproved proxy path returned 404. Original copied mobile-source hashes
were verified unchanged.
