import { zodResolver } from "@hookform/resolvers/zod";
import { applyFieldErrors, formatQuantity, type ApiError, type StockLevelResponse } from "@vet/shared";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAdjustStock } from "@/queries/inventory";

// Fixed reasons for a stock decrease (shrinkage). The `value` is a canonical Arabic string stored on
// the movement's `reason` (the movements ledger reads it raw, Arabic-first); the `key` localizes only
// the dropdown label. A stock increase takes a free-text reason instead.
const DECREASE_REASONS = [
  { value: "هدر", key: "waste" },
  { value: "إنتهاء صلاحية", key: "expiry" },
  { value: "تلف", key: "damage" },
  { value: "سرقة", key: "theft" },
  { value: "فقد", key: "loss" },
] as const;

// The form collects a direction (chip) + a positive magnitude + a reason; on submit we turn that into
// the signed delta + reason the API expects (never an absolute quantity). The reason is free text for
// an increase and a fixed selection for a decrease.
const AdjustFormSchema = z
  .object({
    direction: z.enum(["increase", "decrease"]),
    quantity: z.number().refine((n) => Number.isFinite(n) && n > 0, { message: "positive" }),
    reasonText: z.string().trim().optional(),
    reasonSelect: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.direction === "increase" && !v.reasonText?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reasonText"], message: "required" });
    }
    if (v.direction === "decrease" && !v.reasonSelect) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reasonSelect"], message: "required" });
    }
  });
type AdjustForm = z.infer<typeof AdjustFormSchema>;

const DEFAULTS: AdjustForm = {
  direction: "increase",
  quantity: undefined as unknown as number,
  reasonText: "",
  reasonSelect: "",
};

export function AdjustStockDialog({
  stockItem,
  locationLabel,
  onClose,
}: {
  stockItem: StockLevelResponse | null;
  locationLabel: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const adjust = useAdjustStock();
  const form = useForm<AdjustForm>({
    resolver: zodResolver(AdjustFormSchema),
    defaultValues: DEFAULTS,
  });
  const { register, control, handleSubmit, reset, watch, setError, formState } = form;
  const errors = formState.errors;
  const direction = watch("direction");
  const quantity = watch("quantity");

  useEffect(() => {
    if (stockItem) reset(DEFAULTS);
  }, [stockItem, reset]);

  const onSubmit = handleSubmit((values) => {
    if (!stockItem) return;
    const magnitude = Math.abs(values.quantity);
    const quantityDelta = values.direction === "increase" ? magnitude : -magnitude;
    const reason =
      values.direction === "increase" ? (values.reasonText ?? "").trim() : (values.reasonSelect ?? "");
    adjust.mutate(
      {
        productId: stockItem.productId,
        locationType: stockItem.locationType as "warehouse" | "field",
        locationId: stockItem.locationId,
        quantityDelta,
        reason,
      },
      {
        onSuccess: () => {
          toast.success(t("inventory.adjust.success"));
          onClose();
        },
        onError: (e: ApiError) => applyFieldErrors(e, (name, err) => setError(name as never, err)),
      },
    );
  });

  const signed = Number.isFinite(quantity)
    ? (direction === "increase" ? 1 : -1) * Math.abs(quantity)
    : 0;
  const projected = stockItem ? stockItem.quantity + signed : 0;

  return (
    <Dialog open={stockItem !== null} onClose={onClose} title={t("inventory.adjust.title")}>
      {stockItem ? (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="rounded-md border p-3 text-sm">
            <div className="font-medium">{stockItem.nameAr}</div>
            <div className="text-muted-foreground">{locationLabel}</div>
            <div className="mt-1">
              {t("inventory.col.quantity")}:{" "}
              <span className="font-medium">{formatQuantity(stockItem.quantity, lang)}</span>
              {" → "}
              <span className={projected < 0 ? "font-medium text-destructive" : "font-medium"}>
                {formatQuantity(projected, lang)}
              </span>
            </div>
          </div>

          {/* Direction chips — positive (add) / negative (remove). The magnitude below is always positive. */}
          <Field label={t("inventory.adjust.direction")}>
            <Controller
              control={control}
              name="direction"
              render={({ field }) => (
                <div className="flex gap-2">
                  {(["increase", "decrease"] as const).map((dir) => {
                    const active = field.value === dir;
                    return (
                      <Button
                        key={dir}
                        type="button"
                        variant={active ? "default" : "outline"}
                        className={cn("flex-1", active && dir === "decrease" && "bg-destructive hover:bg-destructive/90")}
                        onClick={() => field.onChange(dir)}
                      >
                        {t(`inventory.adjust.${dir}`)}
                      </Button>
                    );
                  })}
                </div>
              )}
            />
          </Field>

          <Field label={t("inventory.adjust.quantity")} error={errors.quantity?.message}>
            <Input
              type="number"
              step="0.001"
              min="0"
              dir="ltr"
              autoFocus
              {...register("quantity", { valueAsNumber: true })}
            />
          </Field>

          {direction === "increase" ? (
            <Field label={t("inventory.adjust.reason")} error={errors.reasonText?.message}>
              <Input {...register("reasonText")} />
            </Field>
          ) : (
            <Field label={t("inventory.adjust.reason")} error={errors.reasonSelect?.message}>
              <Controller
                control={control}
                name="reasonSelect"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    aria-label={t("inventory.adjust.reason")}
                  >
                    <option value="" disabled>
                      {t("inventory.adjust.reasonPlaceholder")}
                    </option>
                    {DECREASE_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {t(`inventory.adjust.reasons.${r.key}`)}
                      </option>
                    ))}
                  </Select>
                )}
              />
            </Field>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={adjust.isPending}>
              {t("admin.common.cancel")}
            </Button>
            <Button type="submit" disabled={adjust.isPending}>
              {adjust.isPending ? t("admin.common.saving") : t("inventory.adjust.submit")}
            </Button>
          </div>
        </form>
      ) : null}
    </Dialog>
  );
}
