/** Claims the backend puts on the access token (verified server-side; decoded client-side for UX only). */
export interface JwtClaims {
  sub?: string;
  role?: string;
  environment_id?: string;
  /**
   * Effective permission keys (role defaults ± per-user overrides). A single permission decodes
   * as a string, multiple as an array — normalise with {@link permsFromClaims}.
   */
  perms?: string | string[];
  exp?: number;
  [key: string]: unknown;
}

/** Normalise the `perms` claim (string | string[] | absent) into a flat string array. */
export function permsFromClaims(claims: JwtClaims | null): string[] {
  const raw = claims?.perms;
  if (Array.isArray(raw)) return raw.filter((p): p is string => typeof p === "string");
  if (typeof raw === "string") return [raw];
  return [];
}

/** Decode a JWT payload (no signature check — the server is authoritative). Returns null if malformed. */
export function decodeJwt(token: string): JwtClaims | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as JwtClaims;
  } catch {
    return null;
  }
}

export function isExpired(claims: JwtClaims | null, skewSeconds = 0): boolean {
  if (!claims?.exp) return false;
  return claims.exp * 1000 <= Date.now() + skewSeconds * 1000;
}
