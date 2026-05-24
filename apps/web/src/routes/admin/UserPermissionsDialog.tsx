import { PERMISSION_KEY_VALUES } from "@vet/shared";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useAddPermissionOverride, useUserDetail } from "@/queries/users";

/**
 * Per-user permission overrides (grant/deny on top of role defaults). The backend upserts an
 * override — there's no un-override endpoint — so the editor offers grant/deny only; a permission
 * with no override shows neither button active ("default by role").
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
        <div className="space-y-1">
          {PERMISSION_KEY_VALUES.map((key) => {
            const current = effectFor(key);
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <code className="text-xs" dir="ltr">
                  {key}
                </code>
                <div className="flex shrink-0 gap-1">
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
            );
          })}
        </div>
      )}
    </Dialog>
  );
}
