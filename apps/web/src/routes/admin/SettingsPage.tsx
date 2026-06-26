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
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSystemSettings, useUpdateSystemSettings } from "@/queries/systemSettings";
import { useAuthStore } from "@/stores/authStore";

type LeadPreset = { value: number; key: string };
type TFn = (key: string, options?: Record<string, unknown>) => string;

// "Fire before due" presets per reminder. Vaccination due is date-only (days); dosage/appointments
// are intraday (minutes). Stored as a plain int — the option values ARE those ints.
const VACCINATION_LEAD_PRESETS: LeadPreset[] = [
  { value: 0, key: "onDueDate" },
  { value: 1, key: "day1" },
  { value: 2, key: "day2" },
  { value: 3, key: "day3" },
  { value: 7, key: "week1" },
];
const MEDICATION_LEAD_PRESETS: LeadPreset[] = [
  { value: 0, key: "atDose" },
  { value: 5, key: "min5" },
  { value: 15, key: "min15" },
  { value: 30, key: "min30" },
  { value: 60, key: "hour1" },
  { value: 1440, key: "day1" },
];
const APPOINTMENT_LEAD_PRESETS: LeadPreset[] = [
  { value: 30, key: "min30" },
  { value: 60, key: "hour1" },
  { value: 120, key: "hour2" },
  { value: 1440, key: "day1" },
  { value: 2880, key: "day2" },
];

/** Options for a lead-time <Select>; keeps a stored non-preset value selectable rather than dropping it. */
function leadOptions(current: number | undefined, presets: LeadPreset[], t: TFn) {
  const known = current == null || presets.some((p) => p.value === current);
  return [
    ...(known
      ? []
      : [
          <option key="current" value={current}>
            {t("admin.settings.lead.custom", { value: current })}
          </option>,
        ]),
    ...presets.map((p) => (
      <option key={p.value} value={p.value}>
        {t(`admin.settings.lead.${p.key}`)}
      </option>
    )),
  ];
}

export function SettingsPage() {
  const { t } = useTranslation();
  const query = useSystemSettings();
  const update = useUpdateSystemSettings();
  const setCenterName = useAuthStore((s) => s.setCenterName);

  const form = useForm<SystemSettingsPatchRequest>({
    resolver: zodResolver(SystemSettingsPatchRequestSchema),
  });
  const { register, handleSubmit, reset, watch, setValue, setError, formState } = form;
  const errors = formState.errors;

  // Hydrate the form once the settings load (nullable text → "" for the inputs).
  useEffect(() => {
    if (!query.data) return;
    reset({
      centerName: query.data.centerName ?? "",
      defaultExamFee: query.data.defaultExamFee,
      defaultCheckupFee: query.data.defaultCheckupFee,
      entitlementEnabledGlobal: query.data.entitlementEnabledGlobal,
      lowStockThresholdPct: query.data.lowStockThresholdPct,
      expirationWarningDays: query.data.expirationWarningDays,
      taxEnabled: query.data.taxEnabled,
      taxRate: query.data.taxRate,
      logoUrl: query.data.logoUrl ?? "",
      invoiceTaxDetails: query.data.invoiceTaxDetails ?? "",
      nightStayRateMedical: query.data.nightStayRateMedical,
      nightStayRateIcu: query.data.nightStayRateIcu,
      nightStayRateHotel: query.data.nightStayRateHotel,
      nightStayCheckoutHour: query.data.nightStayCheckoutHour,
      medicationReminderLeadMinutes: query.data.medicationReminderLeadMinutes,
      vaccinationReminderLeadDays: query.data.vaccinationReminderLeadDays,
      appointmentReminderLeadMinutes: query.data.appointmentReminderLeadMinutes,
    });
  }, [query.data, reset]);

  const onSubmit = handleSubmit((values) => {
    // PATCH the full snapshot; empty text clears the column (→ null). The center name is never
    // cleared — omit it when blank so the rename is a no-op rather than a rejected empty value.
    const centerName = values.centerName?.trim() ? values.centerName.trim() : undefined;
    const body: SystemSettingsPatchRequest = {
      ...values,
      centerName,
      logoUrl: values.logoUrl?.trim() ? values.logoUrl.trim() : null,
      invoiceTaxDetails: values.invoiceTaxDetails?.trim() ? values.invoiceTaxDetails.trim() : null,
    };
    update.mutate(body, {
      onSuccess: () => {
        // Reflect the rename in the shell + document headers immediately (the JWT carries no name).
        if (centerName) setCenterName(centerName);
        toast.success(t("admin.settings.saved"));
      },
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
              <Field
                label={t("admin.settings.centerName")}
                error={errors.centerName?.message}
                hint={t("admin.settings.centerNameHint")}
              >
                <Input {...register("centerName")} />
              </Field>

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
                  label={t("admin.settings.defaultCheckupFee")}
                  error={errors.defaultCheckupFee?.message}
                >
                  <Input
                    type="number"
                    step="0.01"
                    dir="ltr"
                    {...register("defaultCheckupFee", { valueAsNumber: true })}
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

              <div className="space-y-4 rounded-md border p-4">
                <h3 className="text-sm font-semibold">{t("admin.settings.careSection")}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t("admin.settings.nightStayRateMedical")}
                    error={errors.nightStayRateMedical?.message}
                  >
                    <Input
                      type="number"
                      step="0.01"
                      dir="ltr"
                      {...register("nightStayRateMedical", { valueAsNumber: true })}
                    />
                  </Field>
                  <Field
                    label={t("admin.settings.nightStayRateIcu")}
                    error={errors.nightStayRateIcu?.message}
                  >
                    <Input
                      type="number"
                      step="0.01"
                      dir="ltr"
                      {...register("nightStayRateIcu", { valueAsNumber: true })}
                    />
                  </Field>
                  <Field
                    label={t("admin.settings.nightStayRateHotel")}
                    error={errors.nightStayRateHotel?.message}
                  >
                    <Input
                      type="number"
                      step="0.01"
                      dir="ltr"
                      {...register("nightStayRateHotel", { valueAsNumber: true })}
                    />
                  </Field>
                  <Field
                    label={t("admin.settings.nightStayCheckoutHour")}
                    error={errors.nightStayCheckoutHour?.message}
                  >
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="23"
                      dir="ltr"
                      {...register("nightStayCheckoutHour", { valueAsNumber: true })}
                    />
                  </Field>
                </div>
              </div>

              <div className="space-y-4 rounded-md border p-4">
                <div>
                  <h3 className="text-sm font-semibold">{t("admin.settings.remindersSection")}</h3>
                  <p className="text-xs text-muted-foreground">{t("admin.settings.remindersHint")}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={t("admin.settings.vaccinationReminderLeadDays")}
                    error={errors.vaccinationReminderLeadDays?.message}
                  >
                    <Select
                      value={String(watch("vaccinationReminderLeadDays") ?? "")}
                      onChange={(e) =>
                        setValue("vaccinationReminderLeadDays", Number(e.target.value), { shouldDirty: true })
                      }
                    >
                      {leadOptions(watch("vaccinationReminderLeadDays"), VACCINATION_LEAD_PRESETS, t)}
                    </Select>
                  </Field>
                  <Field
                    label={t("admin.settings.medicationReminderLeadMinutes")}
                    error={errors.medicationReminderLeadMinutes?.message}
                  >
                    <Select
                      value={String(watch("medicationReminderLeadMinutes") ?? "")}
                      onChange={(e) =>
                        setValue("medicationReminderLeadMinutes", Number(e.target.value), { shouldDirty: true })
                      }
                    >
                      {leadOptions(watch("medicationReminderLeadMinutes"), MEDICATION_LEAD_PRESETS, t)}
                    </Select>
                  </Field>
                  <Field
                    label={t("admin.settings.appointmentReminderLeadMinutes")}
                    error={errors.appointmentReminderLeadMinutes?.message}
                  >
                    <Select
                      value={String(watch("appointmentReminderLeadMinutes") ?? "")}
                      onChange={(e) =>
                        setValue("appointmentReminderLeadMinutes", Number(e.target.value), { shouldDirty: true })
                      }
                    >
                      {leadOptions(watch("appointmentReminderLeadMinutes"), APPOINTMENT_LEAD_PRESETS, t)}
                    </Select>
                  </Field>
                  <Field
                    label={t("admin.settings.expirationWarningDays")}
                    error={errors.expirationWarningDays?.message}
                  >
                    <Input
                      type="number"
                      step="1"
                      min="0"
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
                      min="0"
                      dir="ltr"
                      {...register("lowStockThresholdPct", { valueAsNumber: true })}
                    />
                  </Field>
                </div>
              </div>

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
