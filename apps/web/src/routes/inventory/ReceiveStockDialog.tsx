import { zodResolver } from "@hookform/resolvers/zod";
import { applyFieldErrors, type ApiError, type ReceiveStockInput } from "@vet/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { omitEmptyStrings } from "@/lib/forms";
import { useReceiveStock } from "@/queries/inventory";
import { useProducts } from "@/queries/products";

// Receive collects only the business fields; the api wrapper mints the movement id + idempotency
// key. Receipt defaults to the environment's single central warehouse (server-resolved).
const ReceiveFormSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  reason: z.string().trim().optional(),
});
type ReceiveForm = z.infer<typeof ReceiveFormSchema>;

const DEFAULTS: ReceiveForm = { productId: "", quantity: 0, reason: "" };

export function ReceiveStockDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const receive = useReceiveStock();
  const products = useProducts({ take: 200 });
  const form = useForm<ReceiveForm>({ resolver: zodResolver(ReceiveFormSchema), defaultValues: DEFAULTS });
  const { register, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (open) reset(DEFAULTS);
  }, [open, reset]);

  const onSubmit = handleSubmit((values) => {
    const body = omitEmptyStrings(values) as ReceiveStockInput;
    receive.mutate(body, {
      onSuccess: () => {
        toast.success(t("inventory.receive.success"));
        onClose();
      },
      onError: (e: ApiError) => applyFieldErrors(e, (name, err) => setError(name as never, err)),
    });
  });

  return (
    <Dialog open={open} onClose={onClose} title={t("inventory.receive.title")}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t("inventory.receive.product")} error={errors.productId?.message}>
          <Select autoFocus {...register("productId")}>
            <option value="">{t("inventory.receive.product")}</option>
            {(products.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameAr}
                {p.barcode ? ` · ${p.barcode}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("inventory.receive.quantity")} error={errors.quantity?.message}>
          <Input
            type="number"
            step="0.001"
            min="0"
            dir="ltr"
            {...register("quantity", { valueAsNumber: true })}
          />
        </Field>
        <Field label={t("inventory.receive.reason")} error={errors.reason?.message}>
          <Input {...register("reason")} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={receive.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="submit" disabled={receive.isPending}>
            {receive.isPending ? t("admin.common.saving") : t("inventory.receive.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
