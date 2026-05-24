# vet-frontend

pnpm workspace for the **Veterinary Practice Management System** frontend — two apps that share one package:

```
apps/web/        # Center Web App — operations + admin + POS (Vite/React 19, PWA)   — see ../docs/frontend/WEB.md
apps/mobile/     # Field Mobile App — field doctors (Expo/React Native, PowerSync)  — see ../docs/frontend/MOBILE.md
packages/shared/ # @vet/shared — API types, Zod schemas, enums, i18n, formatters, http/offline contracts
```

The build plan lives in [`../docs/frontend/`](../docs/frontend/): **FOUNDATION.md** (this layer), **WEB.md** (W0–W10), **MOBILE.md** (outline), and **BACKEND_PREREQS.md**.

## Getting started

```bash
pnpm install
pnpm gen:api      # regenerate packages/shared/src/types/api.ts from the live backend spec
pnpm build        # build all packages (currently @vet/shared)
pnpm typecheck
pnpm lint
```

> `pnpm gen:api` reads the backend OpenAPI spec. Default URL is `http://localhost:5180/swagger/v1/swagger.json`; override with `VET_API_SPEC_URL`. **Re-run on every backend deploy** (spec-drift guard).

## Golden rule

`packages/shared` is **cross-platform** — it must import cleanly into both the Vite web app and the Expo mobile app. No browser-only or RN-only globals/imports (enforced by ESLint). Platform behaviour (token storage, network transport, offline storage) is defined as an **interface** in `shared` and implemented per app.
