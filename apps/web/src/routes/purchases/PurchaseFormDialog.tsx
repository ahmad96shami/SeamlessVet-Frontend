import { zodResolver } from "@hookform/resolvers/zod";
import {
  IMMEDIATE_PAYMENT_METHODS,
  recordSupplierPayment,
  type PurchaseInvoiceInput,
  type SupplierPaymentInput,
} from "@vet/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { omitEmptyStrings, preventEnterSubmit } from "@/lib/forms";
import { useProducts } from "@/queries/products";
import { useCreatePurchaseInvoice } from "@/queries/purchaseInvoices";
import { useSuppliers } from "@/queries/suppliers";
import { ProductFormDialog } from "@/routes/admin/ProductFormDialog";
import { apiClient } from "@/services/apiClient";

const LineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().min(0),
  discountAmount: z.number().min(0),
  // M25 — per-line expiry + optional lot number ride onto the FEFO lot the receive creates.
  expirationDate: z.string().nullish(),
  lotNumber: z.string().trim().optional(),
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

const EMPTY_LINE = { productId: "", quantity: 0, unitCost: 0, discountAmount: 0, expirationDate: "", lotNumber: "" };
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
  const qc = useQueryClient();
  const create = useCreatePurchaseInvoice();
  const suppliers = useSuppliers({ take: 200 });
  const products = useProducts({ take: 200 });
  const productById = useMemo(() => {
    const m = new Map<string, { nameAr: string; purchasePrice: number }>();
    for (const p of products.data ?? []) m.set(p.id, { nameAr: p.nameAr, purchasePrice: p.purchasePrice });
    return m;
  }, [products.data]);
  const productOptions = useMemo(
    () =>
      (products.data ?? []).map((p) => ({
        value: p.id,
        label: p.nameAr,
        sublabel: p.barcode ?? undefined,
        keywords: p.nameLatin ?? undefined,
      })),
    [products.data],
  );

  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });
  const { register, control, handleSubmit, reset, watch, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const errors = formState.errors;

  // Inline "add product" — reuses the catalog form; the new id is then selected on the
  // line that asked for it (one shared dialog instance across all lines).
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [productDefaultName, setProductDefaultName] = useState("");
  const [addForLine, setAddForLine] = useState<number | null>(null);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  // Optional "pay the supplier now" — recorded as a second call after the invoice posts.
  const [payNow, setPayNow] = useState(false);
  const [payMethod, setPayMethod] = useState<(typeof IMMEDIATE_PAYMENT_METHODS)[number]>("cash");
  const [payAmount, setPayAmount] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [chequeDueDate, setChequeDueDate] = useState("");

  useEffect(() => {
    if (!open) return;
    reset({ ...DEFAULTS, supplierId: presetSupplierId ?? "", lines: [{ ...EMPTY_LINE }] });
    setAddProductOpen(false);
    setAddForLine(null);
    setCreatedProductId(null);
    setPayNow(false);
    setPayMethod("cash");
    setPayAmount("");
    setChequeNumber("");
    setChequeBank("");
    setChequeDueDate("");
  }, [open, presetSupplierId, reset]);

  // Once the freshly-created product lands in the (invalidated) catalog list, select it
  // on the originating line and seed the unit cost like a manual pick would.
  useEffect(() => {
    if (createdProductId === null || addForLine === null) return;
    const p = productById.get(createdProductId);
    if (!p) return;
    setValue(`lines.${addForLine}.productId`, createdProductId, { shouldValidate: true });
    if (!watch(`lines.${addForLine}.unitCost`)) {
      setValue(`lines.${addForLine}.unitCost`, p.purchasePrice, { shouldValidate: true });
    }
    setCreatedProductId(null);
    setAddForLine(null);
  }, [createdProductId, addForLine, productById, setValue, watch]);

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
  // When "pay now" is on, the payment amount must be a positive number before we can submit.
  const payInvalid = payNow && !(Number(payAmount) > 0);

  const onSubmit = handleSubmit(async (values) => {
    const input: PurchaseInvoiceInput = {
      supplierId: values.supplierId,
      discountAmount: values.discountAmount,
      items: values.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        unitCost: l.unitCost,
        discountAmount: l.discountAmount,
        ...(l.expirationDate ? { expirationDate: l.expirationDate } : {}),
        ...(l.lotNumber && l.lotNumber.trim() ? { lotNumber: l.lotNumber.trim() } : {}),
      })),
      ...(values.number && values.number.trim() ? { number: values.number.trim() } : {}),
      ...(values.taxAmount > 0 ? { taxAmount: values.taxAmount } : {}),
      ...(values.notes && values.notes.trim() ? { notes: values.notes.trim() } : {}),
    };

    // 1) Post the invoice. On failure the global mutation-error toast fires; keep the dialog open.
    try {
      await create.mutateAsync(input);
    } catch {
      return;
    }
    toast.success(t("purchases.success"));

    // 2) Optionally record a supplier payment (separate, idempotent call). If it fails the invoice
    // is already saved, so we surface a clear message rather than losing it.
    const amount = Number(payAmount);
    if (payNow && amount > 0) {
      const cheque =
        payMethod === "cheque"
          ? omitEmptyStrings({ chequeNumber, chequeBank, chequeDueDate })
          : {};
      const paymentInput: SupplierPaymentInput = { amount, method: payMethod, ...cheque };
      try {
        await recordSupplierPayment(apiClient, values.supplierId, paymentInput);
        qc.invalidateQueries({ queryKey: ["suppliers"] });
        qc.invalidateQueries({ queryKey: ["supplier-statement", values.supplierId] });
        qc.invalidateQueries({ queryKey: ["supplier-payments", values.supplierId] });
        toast.success(t("purchases.paymentRecorded"));
      } catch {
        toast.error(t("purchases.paymentFailed"));
      }
    }

    onClose();
  });

  return (
    <Dialog open={open} onClose={onClose} title={t("purchases.newTitle")} className="max-w-3xl">
      <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit} className="space-y-4" noValidate>
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
                        <Combobox
                          value={field.value ?? ""}
                          onChange={(v) => {
                            field.onChange(v);
                            // Convenience: seed the unit cost from the product's stored purchase price.
                            const p = productById.get(v);
                            if (p && !watch(`lines.${idx}.unitCost`)) {
                              setValue(`lines.${idx}.unitCost`, p.purchasePrice, { shouldValidate: true });
                            }
                          }}
                          placeholder={t("purchases.lines.selectProduct")}
                          options={productOptions}
                          onCreateNew={(term) => {
                            setProductDefaultName(term);
                            setAddForLine(idx);
                            setAddProductOpen(true);
                          }}
                        />
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
                {/* M25 — per-line lot detail: expiry seeds the FEFO lot's expiration, lot number is free text. */}
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <Field label={t("purchases.lines.expiry")} error={lineErrs?.expirationDate?.message}>
                    <Controller
                      name={`lines.${idx}.expirationDate` as const}
                      control={control}
                      render={({ field }) => (
                        <DatePicker
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder={t("purchases.lines.expiryPlaceholder")}
                        />
                      )}
                    />
                  </Field>
                  <Field label={t("purchases.lines.lotNumber")} error={lineErrs?.lotNumber?.message}>
                    <Input
                      dir="ltr"
                      placeholder={t("purchases.lines.lotNumberPlaceholder")}
                      {...register(`lines.${idx}.lotNumber` as const)}
                    />
                  </Field>
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

        {/* Optional: pay the supplier in the same step (invoice first, then the payment call). */}
        <div className="space-y-3 rounded-xl border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">{t("purchases.payNow")}</div>
              <div className="text-xs text-muted-foreground">{t("purchases.payNowHint")}</div>
            </div>
            <Switch
              checked={payNow}
              onCheckedChange={(c) => {
                setPayNow(c);
                if (c && !payAmount) setPayAmount(total > 0 ? String(total) : "");
              }}
              aria-label={t("purchases.payNow")}
            />
          </div>

          {payNow ? (
            <div className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("purchases.paymentAmount")}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    dir="ltr"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                </Field>
                <Field label={t("suppliers.payment.method")}>
                  <Select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as typeof payMethod)}
                  >
                    {IMMEDIATE_PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {t(`paymentMethod.${m}`)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {payMethod === "cheque" ? (
                <div className="grid gap-4 rounded-xl border bg-[var(--paper-soft)] p-3 sm:grid-cols-2">
                  <Field label={t("cheque.number")}>
                    <Input dir="ltr" value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
                  </Field>
                  <Field label={t("cheque.bank")}>
                    <Input value={chequeBank} onChange={(e) => setChequeBank(e.target.value)} />
                  </Field>
                  <Field label={t("cheque.dueDate")}>
                    <DatePicker value={chequeDueDate} onChange={(e) => setChequeDueDate(e.target.value)} />
                  </Field>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

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
          <Button type="submit" disabled={create.isPending || payInvalid}>
            {create.isPending ? t("purchases.submitting") : t("purchases.submit")}
          </Button>
        </div>
      </form>

      <ProductFormDialog
        open={addProductOpen}
        product={null}
        defaultName={productDefaultName}
        onClose={() => setAddProductOpen(false)}
        onCreated={(id) => setCreatedProductId(id)}
      />
    </Dialog>
  );
}
