import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  CreateOperatingExpenseRequestSchema,
  OPERATING_EXPENSE_CATEGORY_VALUES,
  type ApiError,
  type CreateOperatingExpenseRequest,
  type OperatingExpenseResponse,
} from "@vet/shared";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { omitEmptyStrings } from "@/lib/forms";
import {
  useCreateOperatingExpense,
  useUpdateOperatingExpense,
} from "@/queries/operatingExpenses";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const DEFAULTS: CreateOperatingExpenseRequest = {
  category: "" as CreateOperatingExpenseRequest["category"],
  amount: 0,
  incurredOn: today(),
  paid: false,
  note: "",
};

export function OperatingExpenseFormDialog({
  open,
  expense,
  onClose,
}: {
  open: boolean;
  expense: OperatingExpenseResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateOperatingExpense();
  const update = useUpdateOperatingExpense();
  const form = useForm<CreateOperatingExpenseRequest>({
    resolver: zodResolver(CreateOperatingExpenseRequestSchema),
    defaultValues: DEFAULTS,
  });
  const { register, control, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      expense
        ? {
            category: expense.category as CreateOperatingExpenseRequest["category"],
            amount: expense.amount,
            incurredOn: expense.incurredOn.slice(0, 10),
            paid: expense.paid,
            note: expense.note ?? "",
          }
        : { ...DEFAULTS, incurredOn: today() },
    );
  }, [open, expense, reset]);

  const onSubmit = handleSubmit((values) => {
    const body = omitEmptyStrings(values) as CreateOperatingExpenseRequest;
    const onError = (e: ApiError) => {
      applyFieldErrors(e, (name, err) => setError(name as never, err));
    };
    if (expense) {
      update.mutate(
        { id: expense.id, body },
        {
          onSuccess: () => {
            toast.success(t("admin.common.updated"));
            onClose();
          },
          onError,
        },
      );
    } else {
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
      title={expense ? t("operatingExpenses.editTitle") : t("operatingExpenses.newTitle")}
      className="max-w-lg"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("operatingExpenses.category")} error={errors.category?.message}>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  <option value="" disabled>
                    {t("operatingExpenses.category")}
                  </option>
                  {OPERATING_EXPENSE_CATEGORY_VALUES.map((c) => (
                    <option key={c} value={c}>
                      {t(`operatingExpenseCategory.${c}`)}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
          <Field label={t("operatingExpenses.amount")} error={errors.amount?.message}>
            <Input type="number" step="0.01" min="0" dir="ltr" {...register("amount", { valueAsNumber: true })} />
          </Field>
          <Field label={t("operatingExpenses.incurredOn")} error={errors.incurredOn?.message}>
            <Controller
              name="incurredOn"
              control={control}
              render={({ field }) => (
                <DatePicker value={field.value} onChange={(e) => field.onChange(e.target.value)} />
              )}
            />
          </Field>
          <Field label={t("operatingExpenses.paid")} error={errors.paid?.message}>
            <Controller
              name="paid"
              control={control}
              render={({ field }) => (
                <label className="flex h-10 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--teal-700)]"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  <span className="text-sm">{t("operatingExpenses.paidLabel")}</span>
                </label>
              )}
            />
          </Field>
        </div>
        <Field label={t("operatingExpenses.note")} error={errors.note?.message}>
          <Textarea rows={2} {...register("note")} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("admin.common.saving") : t("admin.common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
