import { isAxiosError } from "axios";

/** The backend error envelope (ExceptionHandlingMiddleware → `{ code, message, fieldErrors? }`). */
export interface ApiErrorBody {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[] | string>;
}

/**
 * Localises an error message by its stable backend `code`; returns the fallback (the server's
 * English text) when no translation exists for the code.
 */
type ApiErrorTranslator = (code: string, fallbackMessage: string) => string;

let translateApiError: ApiErrorTranslator = (_code, fallback) => fallback;

/**
 * Hook the host app's i18n in (web does this at i18n init: `t("apiErrors." + code, ...)`) so every
 * {@link ApiError} carries a localised `message` — toasts then read Arabic without each call site
 * mapping codes itself. Unregistered (e.g. tests), messages pass through untranslated.
 */
export function setApiErrorTranslator(translator: ApiErrorTranslator): void {
  translateApiError = translator;
}

/** Normalised, typed error every API call rejects with; `message` is localised at construction. */
export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(params: {
    code: string;
    message: string;
    status?: number;
    fieldErrors?: Record<string, string[]>;
  }) {
    super(translateApiError(params.code, params.message));
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    this.fieldErrors = params.fieldErrors;
  }
}

function normalizeFieldErrors(
  input?: Record<string, string[] | string>,
): Record<string, string[]> | undefined {
  if (!input) return undefined;
  const out: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(input)) {
    out[field] = Array.isArray(messages) ? messages : [messages];
  }
  return out;
}

/** Map any thrown value (Axios error, Error, unknown) to a typed ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (isAxiosError(err)) {
    const status = err.response?.status;
    const body = err.response?.data as Partial<ApiErrorBody> | undefined;
    if (body && typeof body === "object" && typeof body.code === "string") {
      return new ApiError({
        code: body.code,
        message: body.message ?? "Request failed",
        status,
        fieldErrors: normalizeFieldErrors(body.fieldErrors),
      });
    }
    if (typeof status === "number") {
      return new ApiError({ code: `http_${status}`, message: err.message, status });
    }
    // No response → offline / network failure (the offline queue should retry).
    return new ApiError({ code: "network_error", message: err.message });
  }

  if (err instanceof Error) return new ApiError({ code: "unknown_error", message: err.message });
  return new ApiError({ code: "unknown_error", message: "Unknown error" });
}

/** Minimal structural type matching react-hook-form's `setError` — keeps `shared` RHF-free. */
export type FieldErrorSetter = (name: string, error: { type: string; message: string }) => void;

/** Feed an ApiError's `fieldErrors` into a React Hook Form `setError`. */
export function applyFieldErrors(error: ApiError, setError: FieldErrorSetter): void {
  if (!error.fieldErrors) return;
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    setError(field, { type: "server", message: messages.join(" ") });
  }
}
