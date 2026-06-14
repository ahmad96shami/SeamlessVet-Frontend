import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  ProvisionTenantRequestSchema,
  type ApiError,
  type ProvisionTenantRequest,
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
import { useProvisionTenant } from "@/queries/platform";

const DEFAULTS: ProvisionTenantRequest = {
  centerName: "",
  code: "",
  mode: "solo",
  adminFullName: "",
  adminPhone: "",
  adminPassword: "",
  adminEmail: "",
};

/** Provision a new center + its first admin (W25, POST /platform/tenants). 409 → code-taken toast. */
export function ProvisionTenantDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const provision = useProvisionTenant();
  const { register, handleSubmit, control, reset, setError, formState } = useForm<ProvisionTenantRequest>({
    resolver: zodResolver(ProvisionTenantRequestSchema),
    defaultValues: DEFAULTS,
  });
  const errors = formState.errors;

  useEffect(() => {
    if (open) reset(DEFAULTS);
  }, [open, reset]);

  const onSubmit = handleSubmit((values) => {
    provision.mutate(values, {
      onSuccess: (tenant) => {
        toast.success(t("platform.provision.created", { name: tenant.name }));
        onClose();
      },
      // validation_failed surfaces inline; the 409 environment_code_taken toasts via the apiErrors catalog.
      onError: (e: ApiError) => applyFieldErrors(e, (name, err) => setError(name as never, err)),
    });
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("platform.provision.title")}
      description={t("platform.provision.description")}
      className="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("platform.provision.centerSection")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("platform.provision.centerName")} error={errors.centerName?.message}>
              <Input autoFocus {...register("centerName")} />
            </Field>
            <Field
              label={t("platform.provision.code")}
              error={errors.code?.message}
              hint={t("platform.provision.codeHint")}
            >
              <Input dir="ltr" {...register("code")} />
            </Field>
            <Field label={t("platform.provision.mode")} error={errors.mode?.message}>
              <Controller
                name="mode"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                    <option value="solo">{t("platform.mode.solo")}</option>
                    <option value="partnership">{t("platform.mode.partnership")}</option>
                  </Select>
                )}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("platform.provision.adminSection")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("platform.provision.adminFullName")} error={errors.adminFullName?.message}>
              <Input {...register("adminFullName")} />
            </Field>
            <Field label={t("platform.provision.adminPhone")} error={errors.adminPhone?.message}>
              <Input dir="ltr" {...register("adminPhone")} />
            </Field>
            <Field label={t("platform.provision.adminPassword")} error={errors.adminPassword?.message}>
              <Input dir="ltr" type="password" autoComplete="new-password" {...register("adminPassword")} />
            </Field>
            <Field label={t("platform.provision.adminEmail")} error={errors.adminEmail?.message}>
              <Input dir="ltr" {...register("adminEmail")} />
            </Field>
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={provision.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="submit" disabled={provision.isPending}>
            {provision.isPending ? t("admin.common.saving") : t("platform.provision.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
