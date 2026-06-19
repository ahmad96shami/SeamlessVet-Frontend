import type { CenterOption } from "@vet/shared";

/**
 * Tenant-aware login remembers the last phone + center (W24) so a returning user on a shared
 * browser lands one tap from signing in, and so the shell can label the active center after a
 * reload (the JWT carries only `environment_id`, never the center's display name). All of this is
 * convenience metadata — never a credential — so plain `localStorage` is the right store.
 */
const PHONE_KEY = "vet.web.lastPhone";
const CENTER_KEY = "vet.web.lastCenter";
/** envId → display name: lets {@link centerNameFor} recover the shell label for any known env. */
const NAMES_KEY = "vet.web.centerNames";

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private-mode / quota — remembering is best-effort */
  }
}

/** Record a successful sign-in's phone + chosen center (and learn the env→name mapping). */
export function rememberLogin(phone: string, center: CenterOption): void {
  write(PHONE_KEY, phone);
  write(CENTER_KEY, center);
  const names = read<Record<string, string>>(NAMES_KEY) ?? {};
  names[center.environmentId] = center.name;
  write(NAMES_KEY, names);
}

export function getLastPhone(): string {
  return read<string>(PHONE_KEY) ?? "";
}

export function getLastCenter(): CenterOption | null {
  return read<CenterOption>(CENTER_KEY);
}

/**
 * Update the remembered display name for an env id — used when the manager renames the center from
 * Settings so the shell/document label survives a reload without forcing a re-login.
 */
export function setRememberedCenterName(environmentId: string, name: string): void {
  if (!environmentId) return;
  const names = read<Record<string, string>>(NAMES_KEY) ?? {};
  names[environmentId] = name;
  write(NAMES_KEY, names);
}

/** The remembered display name for an env id (the shell header label after a reload), or null. */
export function centerNameFor(environmentId: string): string | null {
  if (!environmentId) return null;
  const names = read<Record<string, string>>(NAMES_KEY);
  return names?.[environmentId] ?? null;
}
