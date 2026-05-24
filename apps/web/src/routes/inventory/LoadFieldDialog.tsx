import { zodResolver } from "@hookform/resolvers/zod";
import { applyFieldErrors, type ApiError } from "@vet/shared";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useFieldInventories, useLoadField, useUnloadField } from "@/queries/inventory";
import { useProducts } from "@/queries/products";

type Mode = "load" | "unload";

// One transfer = one product, two legs (warehouse ↔ field). The wrapper mints the movement id +
// idempotency key; warehouse is server-resolved.
const TransferFormSchema = z.object({
  fieldInventoryId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().positive(),
  reason: z.string().trim().optional(),
});
type TransferForm = z.infer<typeof TransferFormSchema>;

const DEFAULTS: TransferForm = { fieldInventoryId: "", productId: "", quantity: 0, reason: "" };

export function LoadFieldDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("load");
  const load = useLoadField();
  const unload = useUnloadField();
  const fieldInvs = useFieldInventories();
  const products = useProducts({ take: 200 });
  const form = useForm<TransferForm>({ resolver: zodResolver(TransferFormSchema), defaultValues: DEFAULTS });
  const { register, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;
  const pending = load.isPending || unload.isPending;

  useEffect(() => {
    if (open) {
      setMode("load");
      reset(DEFAULTS);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit((values) => {
    const input = {
      fieldInventoryId: values.fieldInventoryId,
      productId: values.productId,
      quantity: values.quantity,
      ...(values.reason ? { reason: values.reason } : {}),
    };
    const handlers = {
      onSuccess: () => {
        toast.success(t(mode === "load" ? "inventory.load.loadSuccess" : "inventory.load.unloadSuccess"));
        onClose();
      },
      onError: (e: ApiError) => applyFieldErrors(e, (name, err) => setError(name as never, err)),
    };
    if (mode === "load") load.mutate(input, handlers);
    else unload.mutate(input, handlers);
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
          <Select autoFocus {...register("fieldInventoryId")}>
            <option value="">{t("inventory.load.selectDoctor")}</option>
            {(fieldInvs.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.doctorName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("inventory.load.product")} error={errors.productId?.message}>
          <Select {...register("productId")}>
            <option value="">{t("inventory.load.product")}</option>
            {(products.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameAr}
                {p.barcode ? ` · ${p.barcode}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("inventory.load.quantity")} error={errors.quantity?.message}>
          <Input
            type="number"
            step="0.001"
            min="0"
            dir="ltr"
            {...register("quantity", { valueAsNumber: true })}
          />
        </Field>

        <div className="rounded-md border p-3 text-xs text-muted-foreground">
          {t("inventory.load.deltaNote")}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? t("admin.common.saving")
              : t(mode === "load" ? "inventory.load.loadSubmit" : "inventory.load.unloadSubmit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
