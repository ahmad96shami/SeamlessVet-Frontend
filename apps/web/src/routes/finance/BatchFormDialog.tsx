import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  ENTITLEMENT_SYSTEM_VALUES,
  FEE_MODEL_VALUES,
  formatDate,
  type ApiError,
  type BatchCreateRequest,
  type BatchPatchRequest,
  type BatchResponse,
} from "@vet/shared";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { DoctorOption } from "@/hooks/useDoctorOptions";
import { useContracts } from "@/queries/contracts";
import { useCreateBatch, useUpdateBatch } from "@/queries/batches";
import { CustomerPickerDialog } from "@/routes/pos/CustomerPickerDialog";

/**
 * Create/edit a supervision batch. Numeric fields are strings in the form (converted at submit, like
 * the contract form). `entitlementEnabled` is tri-state: "" = inherit the global toggle, else on/off
 * (and on PATCH it can be set on/off but not reverted to inherit — recreate for that). Setting the
 * status to `closed` computes the doctor's entitlement server-side, so the form warns about it.
 */
const FEE_MODELS = FEE_MODEL_VALUES as [string, ...string[]];

const FormSchema = z.object({
  customerId: z.string().min(1),
  responsibleDoctorId: z.string().min(1),
  contractId: z.string(),
  animalCount: z.string(),
  startDate: z.string().min(1),
  endDate: z.string(),
  supervisionFeeModel: z.enum(FEE_MODELS),
  supervisionFeeValue: z.string(),
  entitlementEnabled: z.enum(["", "true", "false"]),
  entitlementSystem: z.string(),
  doctorSharePercent: z.string(),
  doctorShareCeiling: z.string(),
  status: z.enum(["open", "closed"]),
});
type FormValues = z.infer<typeof FormSchema>;

const DEFAULTS: FormValues = {
  customerId: "",
  responsibleDoctorId: "",
  contractId: "",
  animalCount: "0",
  startDate: "",
  endDate: "",
  supervisionFeeModel: "per_bird",
  supervisionFeeValue: "0",
  entitlementEnabled: "",
  entitlementSystem: "",
  doctorSharePercent: "",
  doctorShareCeiling: "",
  status: "open",
};

const num = (s: string): number | undefined => (s.trim() === "" ? undefined : Number(s));
const text = (s: string): string | undefined => (s.trim() === "" ? undefined : s.trim());
const triState = (s: string): boolean | undefined => (s === "" ? undefined : s === "true");

export function BatchFormDialog({
  open,
  batch,
  doctors,
  resolveCustomerName,
  onClose,
}: {
  open: boolean;
  batch: BatchResponse | null;
  doctors: DoctorOption[];
  resolveCustomerName: (id: string) => string | undefined;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const create = useCreateBatch();
  const update = useUpdateBatch();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");

  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });
  const { register, control, handleSubmit, reset, watch, setValue, setError, formState } = form;
  const errors = formState.errors;
  const customerId = watch("customerId");
  const status = watch("status");

  // The contract dropdown is scoped to the chosen customer's contracts.
  const contractsQuery = useContracts({ customerId: customerId || undefined, take: 200 });
  const contracts = customerId ? (contractsQuery.data ?? []) : [];

  useEffect(() => {
    if (!open) return;
    if (batch) {
      reset({
        customerId: batch.customerId,
        responsibleDoctorId: batch.responsibleDoctorId,
        contractId: batch.contractId ?? "",
        animalCount: String(batch.animalCount),
        startDate: batch.startDate,
        endDate: batch.endDate ?? "",
        supervisionFeeModel: batch.supervisionFeeModel as FormValues["supervisionFeeModel"],
        supervisionFeeValue: String(batch.supervisionFeeValue),
        entitlementEnabled:
          batch.entitlementEnabled == null ? "" : batch.entitlementEnabled ? "true" : "false",
        entitlementSystem: batch.entitlementSystem ?? "",
        doctorSharePercent: batch.doctorSharePercent != null ? String(batch.doctorSharePercent) : "",
        doctorShareCeiling: batch.doctorShareCeiling != null ? String(batch.doctorShareCeiling) : "",
        status: batch.status as FormValues["status"],
      });
      setCustomerName(resolveCustomerName(batch.customerId) ?? "");
    } else {
      reset(DEFAULTS);
      setCustomerName("");
    }
  }, [open, batch, reset, resolveCustomerName]);

  const onSubmit = handleSubmit((values) => {
    const onError = (e: ApiError) => applyFieldErrors(e, (name, err) => setError(name as never, err));
    const shared = {
      responsibleDoctorId: values.responsibleDoctorId,
      contractId: text(values.contractId),
      animalCount: Number(values.animalCount || 0),
      startDate: values.startDate,
      endDate: text(values.endDate),
      supervisionFeeModel: values.supervisionFeeModel as BatchCreateRequest["supervisionFeeModel"],
      supervisionFeeValue: Number(values.supervisionFeeValue || 0),
      entitlementEnabled: triState(values.entitlementEnabled),
      entitlementSystem: text(values.entitlementSystem) as
        | BatchCreateRequest["entitlementSystem"]
        | undefined,
      doctorSharePercent: num(values.doctorSharePercent),
      doctorShareCeiling: num(values.doctorShareCeiling),
      status: values.status as BatchCreateRequest["status"],
    };
    if (batch) {
      const body: BatchPatchRequest = shared;
      update.mutate(
        { id: batch.id, body },
        {
          onSuccess: () => {
            toast.success(t("admin.common.updated"));
            onClose();
          },
          onError,
        },
      );
    } else {
      const body: BatchCreateRequest = { ...shared, customerId: values.customerId };
      create.mutate(body, {
        onSuccess: () => {
          toast.success(t("admin.common.created"));
          onClose();
        },
        onError,
      });
    }
  });

  const pending = create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={batch ? t("finance.batches.editTitle") : t("finance.batches.newTitle")}
      className="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t("finance.batches.customer")} error={errors.customerId?.message}>
          {batch ? (
            <Input value={customerName} dir="auto" readOnly />
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={customerName}
                readOnly
                placeholder={t("finance.selectCustomer")}
                onClick={() => setPickerOpen(true)}
                className="cursor-pointer"
              />
              <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
                {t("finance.selectCustomer")}
              </Button>
            </div>
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("finance.batches.responsibleDoctor")}
            error={errors.responsibleDoctorId?.message}
          >
            <Controller
              name="responsibleDoctorId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  <option value="">{t("finance.selectDoctor")}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
          <Field label={t("finance.batches.contract")} error={errors.contractId?.message}>
            <Controller
              name="contractId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  disabled={!customerId}
                >
                  <option value="">{t("finance.batches.noContract")}</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {`${t(`contractStatus.${c.status}`)} · ${formatDate(c.periodStart, lang)}`}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
          <Field label={t("finance.batches.animalCount")} error={errors.animalCount?.message}>
            <Input type="number" step="1" min="0" dir="ltr" {...register("animalCount")} />
          </Field>
          <Field label={t("finance.batches.supervisionFeeModel")}>
            <Controller
              name="supervisionFeeModel"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  {FEE_MODEL_VALUES.map((m) => (
                    <option key={m} value={m}>
                      {t(`feeModel.${m}`)}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
          <Field
            label={t("finance.batches.supervisionFeeValue")}
            error={errors.supervisionFeeValue?.message}
          >
            <Input type="number" step="0.01" min="0" dir="ltr" {...register("supervisionFeeValue")} />
          </Field>
          <Field label={t("finance.batches.startDate")} error={errors.startDate?.message}>
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <DatePicker value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
              )}
            />
          </Field>
          <Field label={t("finance.batches.endDate")} error={errors.endDate?.message}>
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <DatePicker value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
              )}
            />
          </Field>
          <Field label={t("finance.batches.entitlementEnabled")}>
            <Controller
              name="entitlementEnabled"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  <option value="">{t("finance.batches.entitlementInherit")}</option>
                  <option value="true">{t("finance.batches.entitlementOn")}</option>
                  <option value="false">{t("finance.batches.entitlementOff")}</option>
                </Select>
              )}
            />
          </Field>
          <Field label={t("finance.batches.entitlementSystem")}>
            <Controller
              name="entitlementSystem"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  <option value="">—</option>
                  {ENTITLEMENT_SYSTEM_VALUES.map((s) => (
                    <option key={s} value={s}>
                      {t(`entitlementSystem.${s}`)}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
          <Field
            label={t("finance.batches.doctorSharePercent")}
            error={errors.doctorSharePercent?.message}
          >
            <Input type="number" step="0.01" min="0" max="100" dir="ltr" {...register("doctorSharePercent")} />
          </Field>
          <Field
            label={t("finance.batches.doctorShareCeiling")}
            error={errors.doctorShareCeiling?.message}
          >
            <Input type="number" step="0.01" min="0" dir="ltr" {...register("doctorShareCeiling")} />
          </Field>
          <Field label={t("finance.batches.status")}>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  <option value="open">{t("batchStatus.open")}</option>
                  <option value="closed">{t("batchStatus.closed")}</option>
                </Select>
              )}
            />
          </Field>
        </div>

        {status === "closed" ? (
          <div className="alert amber">
            <span>{t("finance.batches.closeWarning")}</span>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("admin.common.saving") : t("admin.common.save")}
          </Button>
        </div>
      </form>

      <CustomerPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(c) => {
          setValue("customerId", c.id, { shouldValidate: true });
          setValue("contractId", ""); // contract list is scoped to the customer
          setCustomerName(c.fullName);
          setPickerOpen(false);
        }}
      />
    </Dialog>
  );
}
