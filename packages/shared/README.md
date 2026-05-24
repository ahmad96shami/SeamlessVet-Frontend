# @vet/shared

The single source of truth shared by both vet clients (Center Web App + Field Mobile App). **Cross-platform** — imports cleanly into Vite/browser **and** Expo/React-Native. No browser-only or RN-only globals/imports (enforced by the workspace ESLint config). Platform behaviour (token storage, network transport, offline storage) is defined here as an **interface** and implemented per app.

## What's inside (per subpath export)

| Import | Contents |
|---|---|
| `@vet/shared/types` | Generated OpenAPI types (`paths`, `components`, `operations`, `Schemas`). Produced by `pnpm gen:api` — **never hand-edited**. |
| `@vet/shared/enums` | The DB enums (SCHEMA.md) as `const` + union type + `_VALUES` array. The source for both apps and form dropdowns. |
| `@vet/shared/schemas` | Hand-written **Zod** schemas per endpoint (request + response). |
| `@vet/shared/api` | Thin, Zod-validated **Axios** wrappers per endpoint (the app passes its configured client). |
| `@vet/shared/queries` | **TanStack Query** hooks per endpoint. (Not re-exported from the root — keeps the root React-free.) |
| `@vet/shared/http` | The transport-agnostic Axios factory, `TokenStorage`/`TokenProvider` interfaces, `ApiError` mapping, `newGuidV7()`/`idempotencyKey()`. |
| `@vet/shared/offline` | The offline write-queue model + `drainQueue()` replay engine; apps supply a `QueueStorage`. |
| `@vet/shared/i18n` | i18next `baseI18nConfig` + `resources` (ar/en, Arabic-primary). |
| `@vet/shared/formatters` | ILS currency, Arabic-aware date, number/quantity/percent (pure, Intl-based). |
| `@vet/shared/constants` | Header names, sync path, locale/currency defaults. |

## The per-endpoint recipe (two-layer contract)

Contract flows **one direction**: C# → OpenAPI (NSwag) → TS types (`openapi-typescript`) → hand-written Zod + Axios + TanStack. For each endpoint, write a **triplet** (~10–15 lines each). Reference example: `POST /auth/login`.

**1. Zod schema** — `src/schemas/<domain>.ts` (lives in shared, cross-platform):

```ts
import { z } from "zod";
export const LoginRequestSchema = z.object({ phonePrimary: z.string().min(1), password: z.string().min(1) });
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export const LoginResponseSchema = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) });
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
```

**2. Axios wrapper** — `src/api/<domain>.ts` (validates I/O at runtime — the drift guard):

```ts
export async function login(client: AxiosInstance, body: LoginRequest): Promise<LoginResponse> {
  const payload = LoginRequestSchema.parse(body);
  const response = await client.post("/auth/login", payload);
  return LoginResponseSchema.parse(response.data);
}
```

**3. TanStack hook** — `src/queries/<domain>.ts` (or each app's `src/queries/` if you prefer per-app hooks):

```ts
export function useLogin(client: AxiosInstance, options?) {
  return useMutation({ mutationFn: (body: LoginRequest) => login(client, body), ...options });
}
```

> The Axios layer is configured by `createApiClient()` (`@vet/shared/http`), which attaches `Authorization` and a fallback `Idempotency-Key` on mutations, and does 401→refresh→retry. For exactly-once **writes**, route through the offline queue (`@vet/shared/offline`) — it persists a **stable** idempotency key and replays it on reconnect.

## Idempotency & ids (every mutating call)

- `newGuidV7()` → the row's client-side `id` (sent in the body on create).
- `idempotencyKey()` → the `Idempotency-Key` header. Mint **once** per logical mutation; the offline queue reuses it across replays so retries apply at most once.

## Regenerating API types

```bash
pnpm gen:api        # default spec: http://localhost:5180/swagger/v1/swagger.json
VET_API_SPEC_URL=https://api.example/swagger/v1/swagger.json pnpm gen:api
```

**Re-run on every backend deploy.** Generated types catch mismatches at compile time; the Zod layer catches them at runtime.
