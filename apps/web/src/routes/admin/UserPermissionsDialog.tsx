import { PERMISSION_KEY_VALUES, ROLE_DEFAULT_PERMISSIONS, type RoleKey } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useAddPermissionOverride, useUserDetail } from "@/queries/users";

/**
 * Per-user permission overrides (grant/deny on top of role defaults). Each row shows the localized
 * permission name + description, the role's default (the standard set the role is seeded with), and
 * grant/deny override buttons. The backend upserts an override — there's no un-override endpoint —
 * so with no override the effective access falls back to the role default ("افتراضي حسب الدور").
 */
export function UserPermissionsDialog({
  userId,
  onClose,
}: {
  userId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const detail = useUserDetail(userId);
  const override = useAddPermissionOverride(userId);

  const roleKey = detail.data?.roleKey as RoleKey | undefined;
  const roleGrants = new Set<string>(roleKey ? ROLE_DEFAULT_PERMISSIONS[roleKey] ?? [] : []);

  const effectFor = (key: string) =>
    detail.data?.permissionOverrides.find((o) => o.permissionKey === key)?.effect ?? null;

  const setEffect = (permissionKey: string, effect: "grant" | "deny") => {
    override.mutate(
      { permissionKey, effect },
      { onSuccess: () => toast.success(t("admin.users.overrideSaved")) },
    );
  };

  return (
    <Dialog
      open={userId !== null}
      onClose={onClose}
      title={
        detail.data
          ? `${t("admin.users.permissionsTitle")} — ${detail.data.fullName}`
          : t("admin.users.permissionsTitle")
      }
      description={t("admin.users.permissionsDescription")}
      className="max-w-2xl"
    >
      {detail.isLoading ? (
        <div className="flex justify-center py-8">
          <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {detail.data ? (
            <div className="flex items-center gap-2 pb-1 text-sm">
              <span className="text-muted-foreground">{t("admin.users.formRole")}:</span>
              <Badge variant="secondary">{t(`roles.${detail.data.roleKey}`, { defaultValue: detail.data.roleName })}</Badge>
            </div>
          ) : null}

          {PERMISSION_KEY_VALUES.map((key) => {
            const current = effectFor(key);
            const roleAllows = roleGrants.has(key);
            return (
              <div
                key={key}
                title={key}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t(`permissions.${key}.name`)}</div>
                  <div className="text-xs text-muted-foreground">{t(`permissions.${key}.desc`)}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={roleAllows ? "success" : "secondary"} className="hidden sm:inline-flex">
                    {t(roleAllows ? "admin.users.roleGrants" : "admin.users.roleDenies")}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={current === "grant" ? "default" : "outline"}
                      onClick={() => setEffect(key, "grant")}
                      disabled={override.isPending}
                    >
                      {t("admin.users.effectGrant")}
                    </Button>
                    <Button
                      size="sm"
                      variant={current === "deny" ? "destructive" : "outline"}
                      onClick={() => setEffect(key, "deny")}
                      disabled={override.isPending}
                    >
                      {t("admin.users.effectDeny")}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}
