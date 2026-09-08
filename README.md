# brolly-exam-prep

The website uses Next.js with React and TypeScript in `apps/web`. Android and iOS
remain on Expo/React Native in `apps/mobile`.

```powershell
pnpm install --frozen-lockfile
pnpm --filter web dev --port 3202
```

The website proxies `/api` to the existing backend at `http://127.0.0.1:8200`.
Set `API_INTERNAL_URL` in the server environment to use another backend.

The website currently requires no login, phone number or OTP. Tests open directly,
and progress stays in this browser. Old login links redirect to the requested test
(or `/tests` when no destination was supplied). Post/category preferences remain
optional under Profile. Answers and explanations still require test submission.

For the complete local stack, run `docker compose up -d --build` and open
http://localhost:3201. To rebuild only the website while the backend is running:

```powershell
docker compose up -d --build --no-deps web
pnpm --filter web test
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web build
```

See [website migration notes](docs/WEB_MIGRATION.md) for routes, storage compatibility,
offline behavior, and the existing backend's limitations. See
[design tooling](docs/DESIGN_TOOLING.md) for shadcn and the installed design skills.
