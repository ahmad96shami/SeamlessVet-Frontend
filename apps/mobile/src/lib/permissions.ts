import { RoleKey } from "@vet/shared";

/**
 * Roles whose defaults include `contracts.activate` (the binding/financial confirm) — admin +
 * accountant (M8). Field-doctor roles (`vet_field` / `vet_both`) hold `contracts.write` (author
 * drafts) but **not** `contracts.activate`.
 */
const CONTRACTS_ACTIVATE_ROLES: ReadonlySet<string> = new Set([RoleKey.Admin, RoleKey.Accountant]);

/**
 * Whether the current role may activate contracts. Permissions are **not** in the JWT (resolved
 * server-side per request), so the device gates the activation affordance by role — the same
 * role-based gating the web uses. The server stays the final authority: a `contracts.activate`
 * the device can't see (a per-user override) still works because the POST is server-checked, and
 * an unauthorized attempt is rejected with `403 missing_permission` and surfaced to the user.
 */
export function canActivateContracts(role: string | undefined | null): boolean {
  return role != null && CONTRACTS_ACTIVATE_ROLES.has(role);
}
