import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  newGuidV7,
  PermissionKey,
  ProductRequestSchema,
  type ApiError,
  type ProductResponse,
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
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { omitEmptyStrings, preventEnterSubmit } from "@/lib/forms";
import { useReceiveStock } from "@/queries/inventory";
import { useCreateProduct, useUpdateProduct } from "@/queries/products";
import { useHasPermission } from "@/stores/authStore";

// The product payload plus a create-only "opening stock" quantity that isn't a product field — it
// seeds the initial warehouse lot via a follow-up /inventory/receive (see onSubmit).
const ProductFormSchema = ProductRequestSchema.extend({
  openingStock: z.number().min(0).optional(),
});
type ProductFormValues = z.infer<typeof ProductFormSchema>;

const DEFAULTS: ProductFormValues = {
  nameAr: "",
  nameLatin: "",
  barcode: "",
  category: "medication",
  manufacturer: "",
  supplier: "",
  purchasePrice: 0,
  sellingPrice: 0,
  unitOfMeasure: "",
  expirationDate: "",
  reorderPoint: 0,
  isConsumable: false,
  openingStock: undefined,
};

export function ProductFormDialog({
  open,
  product,
  onClose,
  defaultName,
  onCreated,
  lockedCategory,
  newTitle,
  editTitle,
}: {
  open: boolean;
  product: ProductResponse | null;
  onClose: () => void;
  /** Prefill the Arabic name when opening a fresh form (e.g. the text typed into a picker search). */
  defaultName?: string;
  /** Fired with the new product's id after a create (not an edit) — lets callers select it inline. */
  onCreated?: (id: string) => void;
  /** Pin the category (e.g. the اللقاحات tab pins `vaccine`): hides the picker + forces it on save. */
  lockedCategory?: ProductFormValues["category"];
  /** Title overrides — let a category-pinned host (e.g. vaccines) word the dialog in its own terms. */
  newTitle?: string;
  editTitle?: string;
}) {
  const { t } = useTranslation();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const receive = useReceiveStock();
  // Seeding opening stock is a warehouse receive — only offer it to staff who may adjust inventory.
  const canReceive = useHasPermission(PermissionKey.InventoryAdjust);
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: DEFAULTS,
  });
  const { register, control, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  // Hydrate on open: the edited product, or blank defaults for create (category pinned when locked).
  useEffect(() => {
    if (!open) return;
    reset(
      product
        ? {
            nameAr: product.nameAr,
            nameLatin: product.nameLatin ?? "",
            barcode: product.barcode ?? "",
            category: product.category as ProductFormValues["category"],
            manufacturer: product.manufacturer ?? "",
            supplier: product.supplier ?? "",
            purchasePrice: product.purchasePrice,
            sellingPrice: product.sellingPrice,
            unitOfMeasure: product.unitOfMeasure ?? "",
            expirationDate: product.expirationDate ?? "",
            reorderPoint: product.reorderPoint,
            isConsumable: product.isConsumable ?? false,
          }
        : { ...DEFAULTS, category: lockedCategory ?? DEFAULTS.category, nameAr: defaultName ?? "" },
    );
  }, [open, product, defaultName, lockedCategory, reset]);

  const onSubmit = handleSubmit((values) => {
    // Opening stock isn't a product field — peel it off, then seed it as a warehouse receive after
    // the product exists (below). The lot inherits the product's expiry so FEFO/near-expiry are right.
    const { openingStock, ...productValues } = values;
    const body = omitEmptyStrings(
      lockedCategory ? { ...productValues, category: lockedCategory } : productValues,
    ); // empty optional text → omitted (stored as null)
    const onError = (e: ApiError) =>
      applyFieldErrors(e, (name, err) => setError(name as never, err));
    if (product) {
      update.mutate(
        { id: product.id, body },
        {
          onSuccess: () => {
            toast.success(t("admin.common.updated"));
            onClose();
          },
          onError,
        },
      );
    } else {
      const seedQty =
        typeof openingStock === "number" && !Number.isNaN(openingStock) && openingStock > 0
          ? openingStock
          : 0;
      create.mutate(
        { ...body, id: newGuidV7() },
        {
          onSuccess: async (res) => {
            onCreated?.(res.id);
            // The product is created; the opening receive is best-effort. If it fails (e.g. no
            // warehouse yet), the product still stands — warn and let staff receive stock later.
            if (seedQty > 0) {
              try {
                await receive.mutateAsync({
                  productId: res.id,
                  quantity: seedQty,
                  expirationDate: body.expirationDate || undefined,
                  reason: t("admin.products.openingStockReason"),
                });
                toast.success(t("admin.common.created"));
              } catch {
                toast.warning(t("admin.products.openingStockFailed"));
              }
            } else {
              toast.success(t("admin.common.created"));
            }
            onClose();
          },
          onError,
        },
      );
    }
  });

  const pending = create.isPending || update.isPending || receive.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        product
          ? (editTitle ?? t("admin.products.editTitle"))
          : (newTitle ?? t("admin.products.newTitle"))
      }
      className="max-w-2xl"
    >
      <form onSubmit={onSubmit} onKeyDown={preventEnterSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("admin.products.nameAr")} error={errors.nameAr?.message}>
            <Input autoFocus {...register("nameAr")} />
          </Field>
          <Field label={t("admin.products.nameLatin")} error={errors.nameLatin?.message}>
            <Input dir="ltr" {...register("nameLatin")} />
          </Field>
          {/* Pinned-category hosts (e.g. اللقاحات) hide the picker — the category is forced on save. */}
          {lockedCategory ? null : (
            <Field label={t("admin.products.category")} error={errors.category?.message}>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)}>
                    <option value="medication">{t("productCategory.medication")}</option>
                    <option value="product">{t("productCategory.product")}</option>
                    <option value="vaccine">{t("productCategory.vaccine")}</option>
                  </Select>
                )}
              />
            </Field>
          )}
          <Field label={t("admin.products.barcode")} error={errors.barcode?.message}>
            <Input dir="ltr" {...register("barcode")} />
          </Field>
          <Field label={t("admin.products.purchasePrice")} error={errors.purchasePrice?.message}>
            <Input
              type="number"
              step="0.01"
              dir="ltr"
              {...register("purchasePrice", { valueAsNumber: true })}
            />
          </Field>
          <Field label={t("admin.products.sellingPrice")} error={errors.sellingPrice?.message}>
            <Input
              type="number"
              step="0.01"
              dir="ltr"
              {...register("sellingPrice", { valueAsNumber: true })}
            />
          </Field>
          <Field label={t("admin.products.reorderPoint")} error={errors.reorderPoint?.message}>
            <Input
              type="number"
              step="0.01"
              dir="ltr"
              {...register("reorderPoint", { valueAsNumber: true })}
            />
          </Field>
          <Field label={t("admin.products.unitOfMeasure")} error={errors.unitOfMeasure?.message}>
            <Input {...register("unitOfMeasure")} />
          </Field>
          <Field label={t("admin.products.manufacturer")} error={errors.manufacturer?.message}>
            <Input {...register("manufacturer")} />
          </Field>
          <Field label={t("admin.products.supplier")} error={errors.supplier?.message}>
            <Input {...register("supplier")} />
          </Field>
          <Field label={t("admin.products.expirationDate")} error={errors.expirationDate?.message}>
            <Controller
              control={control}
              name="expirationDate"
              render={({ field }) => (
                <DatePicker value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)} />
              )}
            />
          </Field>
          {/* Opening stock — a create-only migration hint. Seeds the starting warehouse lot via a
              follow-up receive, so it's offered only to staff who may adjust inventory. */}
          {product || !canReceive ? null : (
            <Field
              label={t("admin.products.openingStock")}
              error={errors.openingStock?.message}
              hint={t("admin.products.openingStockHint")}
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                dir="ltr"
                {...register("openingStock", { valueAsNumber: true })}
              />
            </Field>
          )}
          {/* M27 — an internal-use consumable is taken out via the المستهلكات screen, never sold. A
              vaccine (pinned category) is billable, so the toggle is hidden there. */}
          {lockedCategory ? null : (
            <Field label={t("admin.products.isConsumable")}>
              <Controller
                control={control}
                name="isConsumable"
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t("admin.products.isConsumable")}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t("admin.products.isConsumableHint")}
                    </span>
                  </div>
                )}
              />
            </Field>
          )}
        </div>
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
