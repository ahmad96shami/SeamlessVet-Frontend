import { zodResolver } from "@hookform/resolvers/zod";
import { type ApiError, type PurchaseInvoiceInput } from "@vet/shared";
import { useEffect, useMemo } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProducts } from "@/queries/products";
import { useCreatePurchaseInvoice } from "@/queries/purchaseInvoices";
import { useSuppliers } from "@/queries/suppliers";

const LineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
  discountAmount: z.number().min(0),
});
const FormSchema = z.object({
  supplierId: z.string().min(1),
  number: z.string().trim().optional(),
  discountAmount: z.number().min(0),
  taxAmount: z.number().min(0),
  lines: z.array(LineSchema).min(1),
  notes: z.string().trim().optional(),
});
type FormValues = z.infer<typeof FormSchema>;

const EMPTY_LINE = { productId: "", quantity: 0, unitCost: 0, discountAmount: 0 };
const DEFAULTS: FormValues = {
  supplierId: "",
  number: "",
  discountAmount: 0,
  taxAmount: 0,
  lines: [{ ...EMPTY_LINE }],
  notes: "",
};

export function PurchaseFormDialog({
  open,
  onClose,
  presetSupplierId,
}: {
  open: boolean;
  onClose: () => void;
  /** Pre-select a supplier (e.g. opening the form from a supplier's screen). */
  presetSupplierId?: string;
}) {
  const { t } = useTranslation();
  const create = useCreatePurchaseInvoice();
  const suppliers = useSuppliers({ take: 200 });
  const products = useProducts({ take: 200 });
  const productById = useMemo(() => {
    const m = new Map<string, { nameAr: string; purchasePrice: number }>();
    for (const p of products.data ?? []) m.set(p.id, { nameAr: p.nameAr, purchasePrice: p.purchasePrice });
    return m;
  }, [products.data]);

  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });
  const { register, control, handleSubmit, reset, watch, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const errors = formState.errors;

  useEffect(() => {
    if (open) reset({ ...DEFAULTS, supplierId: presetSupplierId ?? "", lines: [{ ...EMPTY_LINE }] });
  }, [open, presetSupplierId, reset]);

  // Client preview only — the server computes the authoritative subtotal/total (and any sales tax).
  const lines = watch("lines");
  const invoiceDiscount = watch("discountAmount") || 0;
  const tax = watch("taxAmount") || 0;
  const subtotal = (lines ?? []).reduce((sum, l) => {
    const q = Number(l?.quantity) || 0;
    const c = Number(l?.unitCost) || 0;
    const d = Number(l?.discountAmount) || 0;
    return sum + Math.max(0, q * c - d);
  }, 0);
  const total = Math.max(0, subtotal - invoiceDiscount + tax);

  const onSubmit = handleSubmit((values) => {
    const input: PurchaseInvoiceInput = {
      supplierId: values.supplierId,
      discountAmount: values.discountAmount,
      items: values.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitCost: l.unitCost,
        discountAmount: l.discountAmount,
      })),
      ...(values.number && values.number.trim() ? { number: values.number.trim() } : {}),
      ...(values.taxAmount > 0 ? { taxAmount: values.taxAmount } : {}),
      ...(values.notes && values.notes.trim() ? { notes: values.notes.trim() } : {}),
    };
    create.mutate(input, {
      onSuccess: () => {
        toast.success(t("purchases.success"));
        onClose();
      },
      onError: (e: ApiError) => toast.error(e.message),
    });
  });

  return (
    <Dialog open={open} onClose={onClose} title={t("purchases.newTitle")} className="max-w-3xl">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("purchases.supplier")} error={errors.supplierId?.message}>
            <Controller
              name="supplierId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  <option value="">{t("purchases.selectSupplier")}</option>
                  {(suppliers.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
          <Field label={t("purchases.number")} error={errors.number?.message}>
            <Input dir="ltr" {...register("number")} />
          </Field>
        </div>

        {/* Line builder */}
        <div className="space-y-2">
          <div className="text-sm font-medium">{t("purchases.lines.title")}</div>
          {fields.map((f, idx) => {
            const lineErrs = errors.lines?.[idx];
            return (
              <div key={f.id} className="rounded-xl border p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_6rem_7rem_7rem_auto] sm:items-end">
                  <Field label={t("purchases.lines.product")} error={lineErrs?.productId?.message}>
                    <Controller
                      name={`lines.${idx}.productId` as const}
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value ?? ""}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            // Convenience: seed the unit cost from the product's stored purchase price.
                            const p = productById.get(e.target.value);
                            if (p && !watch(`lines.${idx}.unitCost`)) {
                              setValue(`lines.${idx}.unitCost`, p.purchasePrice, { shouldValidate: true });
                            }
                          }}
                        >
                          <option value="">{t("purchases.lines.selectProduct")}</option>
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
                  <Field label={t("purchases.lines.quantity")} error={lineErrs?.quantity?.message}>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      dir="ltr"
                      {...register(`lines.${idx}.quantity` as const, { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label={t("purchases.lines.unitCost")} error={lineErrs?.unitCost?.message}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      dir="ltr"
                      {...register(`lines.${idx}.unitCost` as const, { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label={t("purchases.lines.lineDiscount")} error={lineErrs?.discountAmount?.message}>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      dir="ltr"
                      {...register(`lines.${idx}.discountAmount` as const, { valueAsNumber: true })}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("purchases.lines.remove")}
                    disabled={fields.length === 1 || create.isPending}
                    onClick={() => remove(idx)}
                  >
                    <Icon.trash className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ ...EMPTY_LINE })}
            disabled={create.isPending}
          >
            <Icon.plus className="size-4" />
            {t("purchases.lines.add")}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("purchases.discount")} error={errors.discountAmount?.message}>
            <Input
              type="number"
              step="0.01"
              min="0"
              dir="ltr"
              {...register("discountAmount", { valueAsNumber: true })}
            />
          </Field>
          <Field label={t("purchases.tax")} error={errors.taxAmount?.message}>
            <Input
              type="number"
              step="0.01"
              min="0"
              dir="ltr"
              {...register("taxAmount", { valueAsNumber: true })}
            />
          </Field>
        </div>

        <Field label={t("purchases.notes")} error={errors.notes?.message}>
          <Textarea rows={2} {...register("notes")} />
        </Field>

        {/* Live preview — server-authoritative on issue. */}
        <div className="flex flex-wrap items-center justify-end gap-4 border-t pt-3 text-sm">
          <span className="text-muted-foreground">
            {t("purchases.subtotal")}:{" "}
            <b dir="ltr">
              <Money value={subtotal} />
            </b>
          </span>
          <span className="font-semibold">
            {t("purchases.total")}:{" "}
            <b dir="ltr">
              <Money value={total} />
            </b>
          </span>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={create.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? t("purchases.submitting") : t("purchases.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
