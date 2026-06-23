import { type RoleListItem } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useCreateRole, usePermissionCatalog, useUpdateRole } from "@/queries/roles";

/**
 * Create a custom role or edit an existing role's name + permission set. The permission list comes
 * from GET /admin/permissions (server-canonical), labelled via the `permissions.<key>` i18n map. The
 * `admin` role is protected server-side and never opened here for editing.
 */
export function RoleFormDialog({
  open,
  role,
  onClose,
}: {
  open: boolean;
  role: RoleListItem | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const catalog = usePermissionCatalog(open);
  const create = useCreateRole();
  const update = useUpdateRole();

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? "");
    setSelected(new Set(role?.permissions ?? []));
    setNameError(null);
  }, [open, role]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const pending = create.isPending || update.isPending;

  const onSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t("validation.required"));
      return;
    }
    const body = { name: trimmed, permissions: [...selected] };
    if (role) {
      update.mutate(
        { id: role.id, body },
        {
          onSuccess: () => {
            toast.success(t("admin.common.updated"));
            onClose();
          },
        },
      );
    } else {
      create.mutate(body, {
        onSuccess: () => {
          toast.success(t("admin.common.created"));
          onClose();
        },
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={role ? t("admin.roles.editTitle") : t("admin.roles.newTitle")}
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <Field label={t("admin.roles.name")} error={nameError ?? undefined}>
          <Input
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
          />
        </Field>

        <div>
          <div className="mb-1 text-sm font-medium">{t("admin.roles.permissions")}</div>
          <p className="mb-2 text-xs text-muted-foreground">{t("admin.roles.permissionHint")}</p>
          {catalog.isLoading ? (
            <div className="flex justify-center py-8">
              <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-[50vh] space-y-1 overflow-y-auto rounded-md border p-2">
              {(catalog.data ?? []).map((p) => (
                <label
                  key={p.key}
                  className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-[var(--teal-700)]"
                    checked={selected.has(p.key)}
                    onChange={() => toggle(p.key)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {t(`permissions.${p.key}.name`, { defaultValue: p.description ?? p.key })}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t(`permissions.${p.key}.desc`, { defaultValue: p.key })}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="button" onClick={onSubmit} disabled={pending}>
            {pending ? t("admin.common.saving") : t("admin.common.save")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
