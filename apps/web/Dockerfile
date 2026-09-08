FROM node:22-alpine AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=1 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/mobile/package.json apps/mobile/
COPY apps/web/package.json apps/web/
COPY packages/api-contracts/package.json packages/api-contracts/
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/fixtures/package.json packages/fixtures/
COPY packages/i18n/package.json packages/i18n/
RUN pnpm install --frozen-lockfile --store-dir /pnpm/store --filter web...
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter web build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "apps/web/server.js"]
