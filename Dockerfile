# syntax=docker/dockerfile:1
#
# Center Web App (apps/web) — production static build.
#
# The web app is a Vite + React PWA: it compiles to a folder of static files with NO server runtime.
# The API base URL is COMPILE-TIME for Vite (apps/web/src/lib/config.ts reads import.meta.env.VITE_API_URL),
# so it is baked in here via the VITE_API_URL build arg — change it ⇒ rebuild.
#
# Build context is the pnpm workspace ROOT (vet-frontend/), because apps/web depends on the
# workspace package @vet/shared (which must be built first). The vet-backend prod compose builds this
# as a one-shot `web-build` service and publishes the output into a volume the nginx edge serves.
# See vet-backend/docker-compose.prod.yaml and vet-backend/RUNBOOK.md.

ARG NODE_VERSION=22

# ── Build stage: compile @vet/shared + the web PWA into static files ──────────
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app

# Pin pnpm via corepack (reads "packageManager" from the root package.json).
RUN corepack enable

# Manifests first so the dependency-install layer caches independently of source churn.
# All workspace package.json files are needed for --frozen-lockfile to validate against the lockfile,
# even though we only install the @vet/web dependency closure.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
RUN pnpm install --frozen-lockfile --filter "@vet/web..."

# Sources needed for the web build (mobile is intentionally excluded).
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web

# API base URL is compile-time for Vite — bake it in. The backend stack passes
# https://api.${DOMAIN} here (subdomain split). "..." builds @vet/shared first, then the web app.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter "@vet/web..." build

# ── Output stage: just the static bundle. A one-shot runner copies it to a volume. ──
FROM alpine:3.20 AS dist
WORKDIR /web
COPY --from=build /app/apps/web/dist ./dist
# The compose `web-build` service mounts the publish volume at /out and runs this once:
# wipe stale assets, then copy the fresh build in, so nginx (which mounts the same volume) serves it.
CMD ["sh", "-c", "rm -rf /out/* && cp -a /web/dist/. /out/ && echo 'web assets published to /out'"]
