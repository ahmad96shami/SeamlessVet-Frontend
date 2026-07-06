import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  UpdateUserRequestSchema,
  type ApiError,
  type UpdateUserRequest,
  type UserResponse,
} from "@vet/shared";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { omitEmptyStrings } from "@/lib/forms";
import { RoleSelect } from "@/routes/admin/RoleSelect";
import { useUpdateUser } from "@/queries/users";
import { useAuthStore } from "@/stores/authStore";

/**
 * Edit an existing user's profile and role — PATCH /admin/users/{id}. Password is out of scope (a
 * separate reset flow). Changing the role re-resolves the user's permissions on their next request.
 */
export function UserEditDialog({
  user,
  onClose,
}: {
  user: UserResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const update = useUpdateUser();
  const currentUserId = useAuthStore((s) => s.user?.userId);
  // You cannot change your own role — the server rejects it (`cannot_change_own_role`); mirror that
  // in the UI so the role picker is locked when you're editing your own account. Profile fields stay
  // editable. Guards against an admin demoting themselves and losing access.
  const isSelf = user != null && user.id === currentUserId;
  const form = useForm<UpdateUserRequest>({
    resolver: zodResolver(UpdateUserRequestSchema),
    defaultValues: { fullName: "", phonePrimary: "", email: "", roleKey: "", licenseNumber: "" },
  });
  const { register, control, handleSubmit, reset, setError, watch, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!user) return;
    reset({
      fullName: user.fullName,
      phonePrimary: user.phonePrimary,
      email: user.email ?? "",
      roleKey: user.roleKey,
      licenseNumber: user.licenseNumber ?? "",
    });
  }, [user, reset]);

  const roleKey = watch("roleKey");
  const isVetRole = roleKey.startsWith("vet_");

  const onSubmit = handleSubmit((values) => {
    if (!user) return;
    update.mutate(
      { id: user.id, body: omitEmptyStrings(values) as UpdateUserRequest },
      {
        onSuccess: () => {
          toast.success(t("admin.common.updated"));
          onClose();
        },
        onError: (e: ApiError) => {
          applyFieldErrors(e, (name, err) => setError(name as never, err));
        },
      },
    );
  });

  return (
    <Dialog open={user !== null} onClose={onClose} title={t("admin.users.editTitle")}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("admin.users.formFullName")} error={errors.fullName?.message}>
            <Input autoFocus {...register("fullName")} />
          </Field>
          <Field label={t("admin.users.formPhone")} error={errors.phonePrimary?.message}>
            <Input dir="ltr" {...register("phonePrimary")} />
          </Field>
          <Field label={t("admin.users.formEmail")} error={errors.email?.message}>
            <Input dir="ltr" type="email" {...register("email")} />
          </Field>
          <Field
            label={t("admin.users.formRole")}
            error={errors.roleKey?.message}
            hint={isSelf ? t("admin.users.selfRoleLocked") : undefined}
          >
            <Controller
              name="roleKey"
              control={control}
              render={({ field }) => (
                <RoleSelect value={field.value} onChange={field.onChange} disabled={isSelf} />
              )}
            />
          </Field>
          {isVetRole ? (
            <Field label={t("admin.users.formLicense")} error={errors.licenseNumber?.message}>
              <Input dir="ltr" {...register("licenseNumber")} />
            </Field>
          ) : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? t("admin.common.saving") : t("admin.common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
