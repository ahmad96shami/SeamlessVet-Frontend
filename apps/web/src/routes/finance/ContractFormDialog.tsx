import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  type ApiError,
  type ContractCreateRequest,
  type ContractPatchRequest,
  type ContractResponse,
} from "@vet/shared";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import type { DoctorOption } from "@/hooks/useDoctorOptions";
import { CustomerPickerDialog } from "@/routes/pos/CustomerPickerDialog";
import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCreateContract, useUpdateContract } from "@/queries/contracts";

/**
 * Create/edit a contract. Numeric fields are kept as strings in the form (an empty optional number
 * input yields NaN under `valueAsNumber`), converted at submit — the W3/W4 "local form schema for
 * optional numerics" pattern. The customer is fixed once set (not patchable), so on edit it's shown
 * read-only. New contracts are born `draft`; activation happens via the lifecycle action (W8.3).
 */
const FormSchema = z.object({
  customerId: z.string().min(1),
  responsibleDoctorId: z.string(),
  periodStart: z.string().min(1),
  periodEnd: z.string(),
  totalPrice: z.string(),
  expectedVisitCount: z.string(),
  animalType: z.string(),
  animalCount: z.string(),
});
type FormValues = z.infer<typeof FormSchema>;

const DEFAULTS: FormValues = {
  customerId: "",
  responsibleDoctorId: "",
  periodStart: "",
  periodEnd: "",
  totalPrice: "",
  expectedVisitCount: "",
  animalType: "",
  animalCount: "",
};

const num = (s: string): number | undefined => (s.trim() === "" ? undefined : Number(s));
const text = (s: string): string | undefined => (s.trim() === "" ? undefined : s.trim());

export function ContractFormDialog({
  open,
  contract,
  doctors,
  resolveCustomerName,
  onClose,
}: {
  open: boolean;
  contract: ContractResponse | null;
  doctors: DoctorOption[];
  resolveCustomerName: (id: string) => string | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateContract();
  const update = useUpdateContract();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");

  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });
  const { register, control, handleSubmit, reset, setValue, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    if (contract) {
      reset({
        customerId: contract.customerId,
        responsibleDoctorId: contract.responsibleDoctorId ?? "",
        periodStart: contract.periodStart,
        periodEnd: contract.periodEnd ?? "",
        totalPrice: contract.totalPrice != null ? String(contract.totalPrice) : "",
        expectedVisitCount:
          contract.expectedVisitCount != null ? String(contract.expectedVisitCount) : "",
        animalType: contract.animalType ?? "",
        animalCount: contract.animalCount != null ? String(contract.animalCount) : "",
      });
      setCustomerName(resolveCustomerName(contract.customerId) ?? "");
    } else {
      reset(DEFAULTS);
      setCustomerName("");
    }
  }, [open, contract, reset, resolveCustomerName]);

  const onSubmit = handleSubmit((values) => {
    const onError = (e: ApiError) => applyFieldErrors(e, (name, err) => setError(name as never, err));
    if (contract) {
      const body: ContractPatchRequest = {
        responsibleDoctorId: text(values.responsibleDoctorId),
        periodStart: values.periodStart,
        periodEnd: text(values.periodEnd),
        totalPrice: num(values.totalPrice),
        expectedVisitCount: num(values.expectedVisitCount),
        animalType: text(values.animalType),
        animalCount: num(values.animalCount),
      };
      update.mutate(
        { id: contract.id, body },
        {
          onSuccess: () => {
            toast.success(t("admin.common.updated"));
            onClose();
          },
          onError,
        },
      );
    } else {
      const body: ContractCreateRequest = {
        customerId: values.customerId,
        responsibleDoctorId: text(values.responsibleDoctorId),
        periodStart: values.periodStart,
        periodEnd: text(values.periodEnd),
        totalPrice: num(values.totalPrice),
        expectedVisitCount: num(values.expectedVisitCount),
        animalType: text(values.animalType),
        animalCount: num(values.animalCount),
      };
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
      title={contract ? t("finance.contracts.editTitle") : t("finance.contracts.newTitle")}
      className="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t("finance.contracts.customer")} error={errors.customerId?.message}>
          {contract ? (
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
            label={t("finance.contracts.responsibleDoctor")}
            error={errors.responsibleDoctorId?.message}
          >
            <Controller
              name="responsibleDoctorId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  <option value="">{t("finance.noDoctor")}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
          <Field label={t("finance.contracts.animalType")} error={errors.animalType?.message}>
            <Input
              {...register("animalType")}
              placeholder={t("finance.contracts.animalTypePlaceholder")}
            />
          </Field>
          <Field label={t("finance.contracts.periodStart")} error={errors.periodStart?.message}>
            <Controller
              control={control}
              name="periodStart"
              render={({ field }) => (
                <DatePicker value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
              )}
            />
          </Field>
          <Field label={t("finance.contracts.periodEnd")} error={errors.periodEnd?.message}>
            <Controller
              control={control}
              name="periodEnd"
              render={({ field }) => (
                <DatePicker value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
              )}
            />
          </Field>
          <Field label={t("finance.contracts.totalPrice")} error={errors.totalPrice?.message}>
            <Input type="number" step="0.01" min="0" dir="ltr" {...register("totalPrice")} />
          </Field>
          <Field
            label={t("finance.contracts.expectedVisitCount")}
            error={errors.expectedVisitCount?.message}
          >
            <Input type="number" step="1" min="0" dir="ltr" {...register("expectedVisitCount")} />
          </Field>
          <Field label={t("finance.contracts.animalCount")} error={errors.animalCount?.message}>
            <Input type="number" step="1" min="0" dir="ltr" {...register("animalCount")} />
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
          setCustomerName(c.fullName);
          setPickerOpen(false);
        }}
      />
    </Dialog>
  );
}
