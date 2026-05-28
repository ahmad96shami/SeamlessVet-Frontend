/** Claims the backend puts on the access token (verified server-side; decoded client-side for UX only). */
export interface JwtClaims {
  sub?: string;
  role?: string;
  environment_id?: string;
  exp?: number;
  [key: string]: unknown;
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
