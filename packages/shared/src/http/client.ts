import axios, {
  type AxiosInstance,
  type CreateAxiosDefaults,
  type InternalAxiosRequestConfig,
} from "axios";

import { IDEMPOTENCY_HEADER } from "../constants";
import { toApiError } from "./errors";
import { idempotencyKey } from "./idempotency";
import type { AuthTokens, TokenProvider } from "./types";

export interface ApiClientOptions {
  baseURL: string;
  /** Supplies the access token + refresh behaviour. Injected by the host app. */
  tokenProvider?: TokenProvider;
  /** Auto-attach a fallback Idempotency-Key to mutations lacking one. Default true. */
  autoIdempotency?: boolean;
  /** Paths exempt from auto-idempotency (auth + presigned upload, per API_SURFACE). */
  idempotencyExempt?: RegExp[];
  axiosConfig?: CreateAxiosDefaults;
}

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);
const DEFAULT_EXEMPT: RegExp[] = [/^\/auth\//, /\/attachments\/presigned-upload$/];

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/**
 * Transport-agnostic Axios factory. `baseURL`, the token provider, and the refresh
 * callback are injected by the host app (browser or RN supply their own storage),
 * so this stays cross-platform. Wires:
 *   - Authorization: Bearer <token> on every request
 *   - a fallback Idempotency-Key on mutations (stable keys come from the offline queue)
 *   - 401 → refresh once → retry, else onAuthError()
 * Every rejection is a typed {@link ApiError}.
 *
 * The refresh is single-flight per client: when a page-load's worth of queries all 401 at
 * once (expired access token), they share one in-flight `refresh()` instead of stampeding
 * the rotation endpoint — concurrent rotations of the same token can only race, and exactly
 * one caller (the leader) reports failure via `onAuthError` so the host app toasts once.
 */
export function createApiClient(options: ApiClientOptions): AxiosInstance {
  const {
    baseURL,
    tokenProvider,
    autoIdempotency = true,
    idempotencyExempt = DEFAULT_EXEMPT,
    axiosConfig,
  } = options;

  const instance = axios.create({ baseURL, ...axiosConfig });

  let refreshInFlight: Promise<AuthTokens | null> | null = null;
  /** Join the in-flight refresh or start one; returns the new pair and whether we led it. */
  function refreshOnce(provider: TokenProvider): { flight: Promise<AuthTokens | null>; isLeader: boolean } {
    if (refreshInFlight) return { flight: refreshInFlight, isLeader: false };
    const flight = Promise.resolve()
      .then(() => provider.refresh())
      .catch(() => null);
    refreshInFlight = flight;
    void flight.finally(() => {
      if (refreshInFlight === flight) refreshInFlight = null;
    });
    return { flight, isLeader: true };
  }

  instance.interceptors.request.use(async (config) => {
    const token = await tokenProvider?.getAccessToken();
    if (token) config.headers.set("Authorization", `Bearer ${token}`);

    const method = (config.method ?? "get").toLowerCase();
    const url = config.url ?? "";
    const exempt = idempotencyExempt.some((re) => re.test(url));
    if (
      autoIdempotency &&
      MUTATING_METHODS.has(method) &&
      !exempt &&
      !config.headers.has(IDEMPOTENCY_HEADER)
    ) {
      config.headers.set(IDEMPOTENCY_HEADER, idempotencyKey());
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const apiError = toApiError(error);
      const config = (error as { config?: RetriableConfig }).config;

      if (apiError.status === 401 && tokenProvider && config && !config._retried) {
        config._retried = true;
        const { flight, isLeader } = refreshOnce(tokenProvider);
        const refreshed = await flight;
        if (refreshed) {
          config.headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
          return instance(config);
        }
        if (isLeader) tokenProvider.onAuthError?.();
      }
      return Promise.reject(apiError);
    },
  );

  return instance;
}
