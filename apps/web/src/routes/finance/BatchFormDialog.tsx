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
import { FarmCombobox } from "@/routes/customers/FarmCombobox";
import { CustomerPickerDialog } from "@/routes/pos/CustomerPickerDialog";

/**
 * Create/edit a supervision batch. Numeric fields are strings in the form (converted at submit, like
 * the contract form). `entitlementEnabled` is tri-state: "" = inherit the global toggle, else on/off
 * (and on PATCH it can be set on/off but not reverted to inherit — recreate for that). Setting the
 * M24: status is no longer editable here — closing a cycle goes through the settle flow (تصفية),
 * which re-prices, posts the adjustments, closes, and computes the entitlement in one step.
 */
const FEE_MODELS = FEE_MODEL_VALUES as [string, ...string[]];

const FormSchema = z.object({
  customerId: z.string().min(1),
  responsibleDoctorId: z.string().min(1),
  contractId: z.string(),
  // A cycle (Dawra) always runs on a specific farm of the customer — required (matches the server).
  farmId: z.string().min(1),
  animalCount: z.string(),
  startDate: z.string().min(1),
  endDate: z.string(),
  supervisionFeeModel: z.enum(FEE_MODELS),
  supervisionFeeValue: z.string(),
  entitlementEnabled: z.enum(["", "true", "false"]),
  entitlementSystem: z.string(),
});
type FormValues = z.infer<typeof FormSchema>;

const DEFAULTS: FormValues = {
  customerId: "",
  responsibleDoctorId: "",
  contractId: "",
  farmId: "",
  animalCount: "0",
  startDate: "",
  endDate: "",
  supervisionFeeModel: "per_bird",
  supervisionFeeValue: "0",
  entitlementEnabled: "",
  entitlementSystem: "",
};

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

  // The contract dropdown is scoped to the chosen customer (farms too, inside FarmCombobox).
  const contractsQuery = useContracts({ customerId: customerId || undefined, take: 200 });
  const contracts = customerId ? (contractsQuery.data ?? []) : [];

  useEffect(() => {
    if (!open) return;
    if (batch) {
      reset({
        customerId: batch.customerId,
        responsibleDoctorId: batch.responsibleDoctorId,
        contractId: batch.contractId ?? "",
        farmId: batch.farmId ?? "",
        animalCount: String(batch.animalCount),
        startDate: batch.startDate,
        endDate: batch.endDate ?? "",
        supervisionFeeModel: batch.supervisionFeeModel as FormValues["supervisionFeeModel"],
        supervisionFeeValue: String(batch.supervisionFeeValue),
        entitlementEnabled:
          batch.entitlementEnabled == null ? "" : batch.entitlementEnabled ? "true" : "false",
        entitlementSystem: batch.entitlementSystem ?? "",
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
      farmId: text(values.farmId),
      animalCount: Number(values.animalCount || 0),
      startDate: values.startDate,
      endDate: text(values.endDate),
      supervisionFeeModel: values.supervisionFeeModel as BatchCreateRequest["supervisionFeeModel"],
      supervisionFeeValue: Number(values.supervisionFeeValue || 0),
      entitlementEnabled: triState(values.entitlementEnabled),
      entitlementSystem: text(values.entitlementSystem) as
        | BatchCreateRequest["entitlementSystem"]
        | undefined,
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
      // farmId is required on create (form-validated non-empty) — pass the value, not the optional text().
      const body: BatchCreateRequest = { ...shared, customerId: values.customerId, farmId: values.farmId };
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
            // No dir="auto" — a Latin-first name would flip the input LTR and left-align it;
            // inheriting the page RTL keeps the value on the right like every other field.
            <Input value={customerName} readOnly />
          ) : (
            <Input
              value={customerName}
              readOnly
              placeholder={t("finance.selectCustomer")}
              onClick={() => setPickerOpen(true)}
              className="cursor-pointer"
            />
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
          <Field label={t("finance.batches.farm")} error={errors.farmId?.message}>
            {/* Searchable farm picker scoped to the chosen customer, with an inline "add farm" row
                (disabled until a customer is selected — a farm belongs to a customer). Farm is
                required, so no "no farm" row is offered. */}
            <Controller
              name="farmId"
              control={control}
              render={({ field }) => (
                <FarmCombobox
                  customerId={customerId || undefined}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("finance.batches.farm")}
                />
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
        </div>

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
          setValue("contractId", ""); // contract + farm lists are scoped to the customer
          setValue("farmId", "");
          setCustomerName(c.fullName);
          setPickerOpen(false);
        }}
      />

    </Dialog>
  );
}
