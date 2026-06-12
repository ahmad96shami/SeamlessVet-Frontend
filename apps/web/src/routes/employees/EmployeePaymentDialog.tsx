import { zodResolver } from "@hookform/resolvers/zod";
import {
  EMPLOYEE_PAYMENT_KIND_VALUES,
  IMMEDIATE_PAYMENT_METHODS,
  type ApiError,
  type EmployeePaymentInput,
} from "@vet/shared";
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
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { omitEmptyStrings } from "@/lib/forms";
import { useRecordEmployeePayment } from "@/queries/employees";

// kind selects the HR-ledger effect; a salary_payment may carry a loan deduction (≤ the salary) that
// posts a paired loan_repayment, so the net cash handed over is amount − deduction. Money is always
// leaving (the loan_repayment kind is the employee handing cash back) → immediate methods only.
const FormSchema = z
  .object({
    kind: z.enum(["salary_payment", "loan", "loan_repayment"]),
    amount: z.number().positive(),
    loanRepaymentAmount: z.number().min(0).optional(),
    method: z.enum(["cash", "card", "bank_transfer", "cheque"]),
    notes: z.string().trim().optional(),
    chequeNumber: z.string().trim().max(64).optional(),
    chequeBank: z.string().trim().max(128).optional(),
    chequeDueDate: z.string().optional(),
  })
  .refine((v) => v.kind !== "salary_payment" || (v.loanRepaymentAmount ?? 0) <= v.amount, {
    path: ["loanRepaymentAmount"],
    params: { code: "exceedsAmount" },
  });
type FormValues = z.infer<typeof FormSchema>;

const DEFAULTS: FormValues = {
  kind: "salary_payment",
  amount: 0,
  loanRepaymentAmount: 0,
  method: "cash",
  notes: "",
  chequeNumber: "",
  chequeBank: "",
  chequeDueDate: "",
};

export function EmployeePaymentDialog({
  open,
  employeeId,
  onClose,
}: {
  open: boolean;
  employeeId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const record = useRecordEmployeePayment(employeeId);
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });
  const { register, control, handleSubmit, reset, watch, formState } = form;
  const errors = formState.errors;
  const kind = watch("kind");
  const amount = watch("amount");
  const deduction = watch("loanRepaymentAmount") ?? 0;
  const method = watch("method");
  const isSalary = kind === "salary_payment";
  const netCash = Math.max(0, (amount || 0) - (isSalary ? deduction : 0));

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
    const input: EmployeePaymentInput = {
      kind: values.kind,
      amount: values.amount,
      // A loan deduction only rides along on a salary payment, and only when > 0.
      ...(values.kind === "salary_payment" && (values.loanRepaymentAmount ?? 0) > 0
        ? { loanRepaymentAmount: values.loanRepaymentAmount }
        : {}),
      method: values.method,
      ...(values.notes && values.notes.trim() ? { notes: values.notes.trim() } : {}),
      ...cheque,
    };
    record.mutate(input, {
      onSuccess: () => {
        toast.success(t("employees.payment.success"));
        onClose();
      },
      onError: (e: ApiError) => toast.error(e.message),
    });
  });

  return (
    <Dialog open={open} onClose={onClose} title={t("employees.payment.title")} className="max-w-md">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t("employees.payment.kind")} error={errors.kind?.message}>
          <Controller
            name="kind"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                {EMPLOYEE_PAYMENT_KIND_VALUES.map((k) => (
                  <option key={k} value={k}>
                    {t(`employeePaymentKind.${k}`)}
                  </option>
                ))}
              </Select>
            )}
          />
        </Field>

        <Field label={t("employees.payment.amount")} error={errors.amount?.message}>
          <Input
            type="number"
            step="0.01"
            min="0"
            dir="ltr"
            autoFocus
            {...register("amount", { valueAsNumber: true })}
          />
        </Field>

        {/* The future-salary-deduction pairing: a loan repaid out of this salary. */}
        {isSalary ? (
          <Field
            label={t("employees.payment.loanDeduction")}
            error={errors.loanRepaymentAmount?.message}
          >
            <Input
              type="number"
              step="0.01"
              min="0"
              dir="ltr"
              {...register("loanRepaymentAmount", { valueAsNumber: true })}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("employees.payment.loanDeductionHint")}
            </p>
            {deduction > 0 ? (
              <p className="mt-1 text-xs">
                {t("employees.payment.netCash")}:{" "}
                <b dir="ltr">
                  <Money value={netCash} />
                </b>
              </p>
            ) : null}
          </Field>
        ) : null}

        <Field label={t("employees.payment.method")} error={errors.method?.message}>
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
                  <DatePicker
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                )}
              />
            </Field>
          </div>
        ) : null}

        <Field label={t("employees.payment.notes")} error={errors.notes?.message}>
          <Textarea rows={2} {...register("notes")} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={record.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="submit" disabled={record.isPending}>
            {record.isPending ? t("employees.payment.submitting") : t("employees.payment.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
