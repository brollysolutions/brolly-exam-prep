# Web build of the Expo app (app.json web.output = "static") served by nginx.
# Plain Dockerfile syntax only (no RUN --mount): on hosts without the buildx plugin Compose
# falls back to the legacy builder, and this file must build there too (F-27).
# Build context is the REPO ROOT (the app depends on the @tslprb/* workspace packages):
#   docker build -f apps/mobile/Dockerfile .          (or: docker compose build web)

# ---------------------------------------------------------------- build ----
FROM node:22-alpine AS build

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=1 \
    EXPO_NO_TELEMETRY=1
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

WORKDIR /repo

# Manifests first so the install layer is reused until a dependency changes.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/mobile/package.json apps/mobile/
COPY apps/web/package.json apps/web/
COPY packages/api-contracts/package.json packages/api-contracts/
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/fixtures/package.json packages/fixtures/
COPY packages/i18n/package.json packages/i18n/
# No BuildKit cache mount (see header): the layer cache still skips this step until a manifest or the lockfile changes.
RUN pnpm install --frozen-lockfile --store-dir /pnpm/store --filter mobile...

# Sources: the workspace packages the app imports (TS source, no build step) and the app.
COPY packages ./packages
COPY apps/mobile ./apps/mobile

# Baked into the bundle at export time. The browser calls the api through nginx on the web
# origin (PUBLIC_URL/api, see nginx.conf and docker-compose.yml), never the compose service name.
ARG EXPO_PUBLIC_API=http
ARG EXPO_PUBLIC_API_URL=http://localhost:3201/api
ENV EXPO_PUBLIC_API=$EXPO_PUBLIC_API \
    EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL

WORKDIR /repo/apps/mobile
RUN pnpm exec expo export --platform web --output-dir dist

# ---------------------------------------------------------------- serve ----
FROM nginx:alpine

COPY apps/mobile/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/mobile/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
