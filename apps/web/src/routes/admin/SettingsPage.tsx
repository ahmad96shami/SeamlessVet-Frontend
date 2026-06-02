import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  SystemSettingsPatchRequestSchema,
  type ApiError,
  type SystemSettingsPatchRequest,
} from "@vet/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { AdminPage } from "@/components/layout/AdminPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSystemSettings, useUpdateSystemSettings } from "@/queries/systemSettings";

export function SettingsPage() {
  const { t } = useTranslation();
  const query = useSystemSettings();
  const update = useUpdateSystemSettings();

  const form = useForm<SystemSettingsPatchRequest>({
    resolver: zodResolver(SystemSettingsPatchRequestSchema),
  });
  const { register, handleSubmit, reset, watch, setValue, setError, formState } = form;
  const errors = formState.errors;

  // Hydrate the form once the settings load (nullable text → "" for the inputs).
  useEffect(() => {
    if (!query.data) return;
    reset({
      defaultExamFee: query.data.defaultExamFee,
      entitlementEnabledGlobal: query.data.entitlementEnabledGlobal,
      lowStockThresholdPct: query.data.lowStockThresholdPct,
      expirationWarningDays: query.data.expirationWarningDays,
      taxEnabled: query.data.taxEnabled,
      taxRate: query.data.taxRate,
      logoUrl: query.data.logoUrl ?? "",
      invoiceTaxDetails: query.data.invoiceTaxDetails ?? "",
    });
  }, [query.data, reset]);

  const onSubmit = handleSubmit((values) => {
    // PATCH the full snapshot; empty text clears the column (→ null).
    const body: SystemSettingsPatchRequest = {
      ...values,
      logoUrl: values.logoUrl?.trim() ? values.logoUrl.trim() : null,
      invoiceTaxDetails: values.invoiceTaxDetails?.trim() ? values.invoiceTaxDetails.trim() : null,
    };
    update.mutate(body, {
      onSuccess: () => toast.success(t("admin.settings.saved")),
      onError: (e: ApiError) => applyFieldErrors(e, (name, err) => setError(name as never, err)),
    });
  });

  const taxEnabled = watch("taxEnabled");
  const entitlement = watch("entitlementEnabledGlobal");

  return (
    <AdminPage title={t("admin.settings.title")} description={t("admin.settings.description")}>
      <Card className="mx-auto max-w-3xl">
        <CardContent className="pt-6">
          {!query.data ? (
            <div className="flex justify-center py-10">
              <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("admin.settings.defaultExamFee")} error={errors.defaultExamFee?.message}>
                  <Input
                    type="number"
                    step="0.01"
                    dir="ltr"
                    {...register("defaultExamFee", { valueAsNumber: true })}
                  />
                </Field>
                <Field
                  label={t("admin.settings.expirationWarningDays")}
                  error={errors.expirationWarningDays?.message}
                >
                  <Input
                    type="number"
                    step="1"
                    dir="ltr"
                    {...register("expirationWarningDays", { valueAsNumber: true })}
                  />
                </Field>
                <Field
                  label={t("admin.settings.lowStockThresholdPct")}
                  error={errors.lowStockThresholdPct?.message}
                >
                  <Input
                    type="number"
                    step="0.1"
                    dir="ltr"
                    {...register("lowStockThresholdPct", { valueAsNumber: true })}
                  />
                </Field>
                <Field label={t("admin.settings.taxRate")} error={errors.taxRate?.message}>
                  <Input
                    type="number"
                    step="0.01"
                    dir="ltr"
                    {...register("taxRate", { valueAsNumber: true })}
                  />
                </Field>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <Label>{t("admin.settings.entitlementEnabledGlobal")}</Label>
                  <Switch
                    checked={!!entitlement}
                    onCheckedChange={(v) =>
                      setValue("entitlementEnabledGlobal", v, { shouldDirty: true })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <Label>{t("admin.settings.taxEnabled")}</Label>
                  <Switch
                    checked={!!taxEnabled}
                    onCheckedChange={(v) => setValue("taxEnabled", v, { shouldDirty: true })}
                  />
                </div>
              </div>

              <Field label={t("admin.settings.logoUrl")} error={errors.logoUrl?.message}>
                <Input type="url" dir="ltr" {...register("logoUrl")} />
              </Field>
              <Field
                label={t("admin.settings.invoiceTaxDetails")}
                error={errors.invoiceTaxDetails?.message}
              >
                <Textarea {...register("invoiceTaxDetails")} />
              </Field>

              <div className="flex justify-end">
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? t("admin.common.saving") : t("admin.common.save")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </AdminPage>
  );
}
