import axios, {
  type AxiosInstance,
  type CreateAxiosDefaults,
  type InternalAxiosRequestConfig,
} from "axios";

import { IDEMPOTENCY_HEADER } from "../constants";
import { toApiError } from "./errors";
import { idempotencyKey } from "./idempotency";
import type { TokenProvider } from "./types";

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
        const refreshed = await tokenProvider.refresh().catch(() => null);
        if (refreshed) {
          config.headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
          return instance(config);
        }
        tokenProvider.onAuthError?.();
      }
      return Promise.reject(apiError);
    },
  );

  return instance;
}
