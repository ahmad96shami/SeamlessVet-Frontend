/** Badge variant for a center's live status (W25): active = success, suspended = destructive. */
export function tenantStatusVariant(status: string): "success" | "destructive" | "secondary" {
  if (status === "active") return "success";
  if (status === "suspended") return "destructive";
  return "secondary";
}
