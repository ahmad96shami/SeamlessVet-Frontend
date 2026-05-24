import { zodResolver } from "@hookform/resolvers/zod";
import { applyFieldErrors, formatQuantity, type ApiError, type StockLevelResponse } from "@vet/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAdjustStock } from "@/queries/inventory";

// Adjust targets one existing (product, location) stock line — the product + location come from the
// row, so the form only collects the signed delta + a mandatory reason (never an absolute quantity).
const AdjustFormSchema = z.object({
  quantityDelta: z.number().refine((n) => n !== 0, { message: "nonzero" }),
  reason: z.string().trim().min(1),
});
type AdjustForm = z.infer<typeof AdjustFormSchema>;

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
    defaultValues: { quantityDelta: 0, reason: "" },
  });
  const { register, handleSubmit, reset, watch, setError, formState } = form;
  const errors = formState.errors;
  const delta = watch("quantityDelta");

  useEffect(() => {
    if (stockItem) reset({ quantityDelta: 0, reason: "" });
  }, [stockItem, reset]);

  const onSubmit = handleSubmit((values) => {
    if (!stockItem) return;
    adjust.mutate(
      {
        productId: stockItem.productId,
        locationType: stockItem.locationType as "warehouse" | "field",
        locationId: stockItem.locationId,
        quantityDelta: values.quantityDelta,
        reason: values.reason,
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

  const projected = stockItem ? stockItem.quantity + (Number.isFinite(delta) ? delta : 0) : 0;

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
          <Field label={t("inventory.adjust.delta")} error={errors.quantityDelta?.message}>
            <Input
              type="number"
              step="0.001"
              dir="ltr"
              autoFocus
              {...register("quantityDelta", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">{t("inventory.adjust.deltaHint")}</p>
          </Field>
          <Field label={t("inventory.adjust.reason")} error={errors.reason?.message}>
            <Input {...register("reason")} />
          </Field>
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
