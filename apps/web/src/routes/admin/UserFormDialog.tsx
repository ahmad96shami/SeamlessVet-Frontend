import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  CreateUserRequestSchema,
  ROLE_KEY_VALUES,
  type ApiError,
  type CreateUserRequest,
} from "@vet/shared";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { omitEmptyStrings } from "@/lib/forms";
import { useCreateUser } from "@/queries/users";

const DEFAULTS: CreateUserRequest = {
  fullName: "",
  phonePrimary: "",
  email: "",
  password: "",
  roleKey: "",
  licenseNumber: "",
};

/**
 * Admin-created staff account (cashier, in-clinic doctor, …) — POST /admin/users.
 * The account is active immediately: no registration-queue round-trip. Create-only;
 * status/permissions edits stay on the roster row actions.
 */
export function UserFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateUser();
  const form = useForm<CreateUserRequest>({
    resolver: zodResolver(CreateUserRequestSchema),
    defaultValues: DEFAULTS,
  });
  const { register, control, handleSubmit, reset, setError, watch, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (open) reset(DEFAULTS);
  }, [open, reset]);

  // The license field only applies to vet roles (mirrors the self-registration form).
  const roleKey = watch("roleKey");
  const isVetRole = roleKey.startsWith("vet_");

  const onSubmit = handleSubmit((values) => {
    create.mutate(omitEmptyStrings(values) as CreateUserRequest, {
      onSuccess: () => {
        toast.success(t("admin.users.created"));
        onClose();
      },
      onError: (e: ApiError) => {
        applyFieldErrors(e, (name, err) => setError(name as never, err));
        if (!e.fieldErrors) toast.error(e.message);
      },
    });
  });

  return (
    <Dialog open={open} onClose={onClose} title={t("admin.users.newTitle")}>
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
          <Field label={t("admin.users.formPassword")} error={errors.password?.message}>
            <Input dir="ltr" type="password" autoComplete="new-password" {...register("password")} />
          </Field>
          <Field label={t("admin.users.formRole")} error={errors.roleKey?.message}>
            <Controller
              name="roleKey"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  <option value="" disabled>
                    {t("admin.users.formRole")}
                  </option>
                  {ROLE_KEY_VALUES.map((r) => (
                    <option key={r} value={r}>
                      {t(`roles.${r}`)}
                    </option>
                  ))}
                </Select>
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
          <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? t("admin.common.saving") : t("admin.common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
