import { zodResolver } from "@hookform/resolvers/zod";
import { IMMEDIATE_PAYMENT_METHODS, type ApiError, type SupplierPaymentInput } from "@vet/shared";
import { useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { omitEmptyStrings } from "@/lib/forms";
import { useRecordSupplierPayment } from "@/queries/suppliers";

// Supplier payments never use customer credit — only the immediate methods (incl. cheque).
const FormSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["cash", "card", "bank_transfer", "cheque"]),
  notes: z.string().trim().optional(),
  chequeNumber: z.string().trim().max(64).optional(),
  chequeBank: z.string().trim().max(128).optional(),
  chequeDueDate: z.string().optional(),
});
type FormValues = z.infer<typeof FormSchema>;

const DEFAULTS: FormValues = {
  amount: 0,
  method: "cash",
  notes: "",
  chequeNumber: "",
  chequeBank: "",
  chequeDueDate: "",
};

export function SupplierPaymentDialog({
  open,
  supplierId,
  onClose,
}: {
  open: boolean;
  supplierId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const record = useRecordSupplierPayment(supplierId);
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });
  const { register, control, handleSubmit, reset, watch, formState } = form;
  const errors = formState.errors;
  const method = watch("method");

  useEffect(() => {
    if (open) reset(DEFAULTS);
  }, [open, reset]);

  const onSubmit = handleSubmit((values) => {
    const cheque =
      values.method === "cheque"
        ? omitEmptyStrings({
            chequeNumber: values.chequeNumber,
            chequeBank: values.chequeBank,
            chequeDueDate: values.chequeDueDate,
          })
        : {};
    const input: SupplierPaymentInput = {
      amount: values.amount,
      method: values.method,
      ...(values.notes && values.notes.trim() ? { notes: values.notes.trim() } : {}),
      ...cheque,
    };
    record.mutate(input, {
      onSuccess: () => {
        toast.success(t("suppliers.payment.success"));
        onClose();
      },
      onError: (e: ApiError) => toast.error(e.message),
    });
  });

  return (
    <Dialog open={open} onClose={onClose} title={t("suppliers.payment.title")} className="max-w-md">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t("suppliers.payment.amount")} error={errors.amount?.message}>
          <Input
            type="number"
            step="0.01"
            min="0"
            dir="ltr"
            autoFocus
            {...register("amount", { valueAsNumber: true })}
          />
        </Field>
        <Field label={t("suppliers.payment.method")} error={errors.method?.message}>
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                {IMMEDIATE_PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`paymentMethod.${m}`)}
                  </option>
                ))}
              </Select>
            )}
          />
        </Field>

        {method === "cheque" ? (
          <div className="grid gap-4 rounded-xl border bg-[var(--paper-soft)] p-3 sm:grid-cols-2">
            <Field label={t("cheque.number")} error={errors.chequeNumber?.message}>
              <Input dir="ltr" {...register("chequeNumber")} />
            </Field>
            <Field label={t("cheque.bank")} error={errors.chequeBank?.message}>
              <Input {...register("chequeBank")} />
            </Field>
            <Field label={t("cheque.dueDate")} error={errors.chequeDueDate?.message}>
              <Controller
                name="chequeDueDate"
                control={control}
                render={({ field }) => (
                  <DatePicker value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
                )}
              />
            </Field>
          </div>
        ) : null}

        <Field label={t("suppliers.payment.notes")} error={errors.notes?.message}>
          <Textarea rows={2} {...register("notes")} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={record.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="submit" disabled={record.isPending}>
            {record.isPending ? t("suppliers.payment.submitting") : t("suppliers.payment.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
