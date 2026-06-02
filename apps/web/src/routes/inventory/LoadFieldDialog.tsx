import { zodResolver } from "@hookform/resolvers/zod";
import { type ApiError, toApiError } from "@vet/shared";
import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useFieldInventories, useLoadField, useUnloadField } from "@/queries/inventory";
import { useProducts } from "@/queries/products";

type Mode = "load" | "unload";

// One transfer = one doctor + N product lines. Each line is its own /inventory/load-field (or
// /unload-field) call; the wrapper mints a unique movement id + idempotency key per call.
const LineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
});
const TransferFormSchema = z.object({
  fieldInventoryId: z.string().min(1),
  lines: z.array(LineSchema).min(1),
  reason: z.string().trim().optional(),
});
type TransferForm = z.infer<typeof TransferFormSchema>;

const EMPTY_LINE = { productId: "", quantity: 0 };
const DEFAULTS: TransferForm = {
  fieldInventoryId: "",
  lines: [{ ...EMPTY_LINE }],
  reason: "",
};

function lineErrorText(e: ApiError): string {
  if (e.fieldErrors) {
    const msgs = Object.values(e.fieldErrors).flat();
    if (msgs.length > 0) return msgs.join(" ");
  }
  return e.message;
}

export function LoadFieldDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("load");
  const load = useLoadField();
  const unload = useUnloadField();
  const fieldInvs = useFieldInventories();
  const products = useProducts({ take: 200 });
  const form = useForm<TransferForm>({
    resolver: zodResolver(TransferFormSchema),
    defaultValues: DEFAULTS,
  });
  const { register, control, handleSubmit, reset, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const errors = formState.errors;
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("load");
      reset(DEFAULTS);
      setLineErrors({});
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    const reason = values.reason?.trim();
    const mutate = mode === "load" ? load.mutateAsync : unload.mutateAsync;
    const results = await Promise.allSettled(
      values.lines.map((ln) =>
        mutate({
          fieldInventoryId: values.fieldInventoryId,
          productId: ln.productId,
          quantity: ln.quantity,
          ...(reason ? { reason } : {}),
        }),
      ),
    );
    const okIdx: number[] = [];
    const nextErrors: Record<string, string> = {};
    results.forEach((r, i) => {
      const lineId = fields[i]?.id;
      if (!lineId) return;
      if (r.status === "fulfilled") okIdx.push(i);
      else nextErrors[lineId] = lineErrorText(toApiError(r.reason));
    });
    setSubmitting(false);

    const total = results.length;
    const okCount = okIdx.length;
    if (okCount === total) {
      toast.success(
        t(mode === "load" ? "inventory.load.loadSuccess" : "inventory.load.unloadSuccess"),
      );
      onClose();
      return;
    }
    // Remove succeeded lines in descending order so the failing lines keep their field ids
    // (so the lineErrors[id] entries stay attached after re-render).
    [...okIdx].sort((a, b) => b - a).forEach((i) => remove(i));
    setLineErrors(nextErrors);
    toast.error(
      t("inventory.partialSuccess", { ok: okCount, total, count: total - okCount }),
    );
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t(mode === "load" ? "inventory.load.title" : "inventory.load.unloadTitle")}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="flex gap-1 rounded-md border p-1">
          {(["load", "unload"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors",
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(m === "load" ? "inventory.load.action" : "inventory.load.unloadAction")}
            </button>
          ))}
        </div>

        <Field label={t("inventory.load.doctor")} error={errors.fieldInventoryId?.message}>
          <Controller
            name="fieldInventoryId"
            control={control}
            render={({ field }) => (
              <Select autoFocus value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)}>
                <option value="">{t("inventory.load.selectDoctor")}</option>
                {(fieldInvs.data ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.doctorName}
                  </option>
                ))}
              </Select>
            )}
          />
        </Field>

        <div className="space-y-3">
          {fields.map((f, idx) => {
            const lineError = lineErrors[f.id];
            const lineErrs = errors.lines?.[idx];
            return (
              <div key={f.id} className="rounded-md border p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field
                      label={t("inventory.load.product")}
                      error={lineErrs?.productId?.message}
                    >
                      <Controller
                        name={`lines.${idx}.productId` as const}
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            <option value="">{t("inventory.lines.selectProduct")}</option>
                            {(products.data ?? []).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nameAr}
                                {p.barcode ? ` · ${p.barcode}` : ""}
                              </option>
                            ))}
                          </Select>
                        )}
                      />
                    </Field>
                  </div>
                  <div className="w-32">
                    <Field
                      label={t("inventory.load.quantity")}
                      error={lineErrs?.quantity?.message}
                    >
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        dir="ltr"
                        {...register(`lines.${idx}.quantity` as const, { valueAsNumber: true })}
                      />
                    </Field>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("inventory.lines.remove")}
                    disabled={fields.length === 1 || submitting}
                    onClick={() => {
                      remove(idx);
                      if (f.id in lineErrors) {
                        const { [f.id]: _omit, ...rest } = lineErrors;
                        setLineErrors(rest);
                      }
                    }}
                  >
                    <Icon.trash className="size-4" />
                  </Button>
                </div>
                {lineError ? (
                  <p className="mt-2 text-xs text-destructive">{lineError}</p>
                ) : null}
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ ...EMPTY_LINE })}
            disabled={submitting}
          >
            <Icon.plus className="size-4" />
            {t("inventory.lines.add")}
          </Button>
        </div>

        <Field label={t("inventory.receive.reason")} error={errors.reason?.message}>
          <Input {...register("reason")} />
        </Field>

        <div className="rounded-md border p-3 text-xs text-muted-foreground">
          {t("inventory.load.deltaNote")}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting
              ? t("admin.common.saving")
              : t(mode === "load" ? "inventory.load.loadSubmit" : "inventory.load.unloadSubmit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
