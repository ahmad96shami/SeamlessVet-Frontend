import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  newGuidV7,
  ProductRequestSchema,
  type ApiError,
  type ProductRequest,
  type ProductResponse,
} from "@vet/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { omitEmptyStrings } from "@/lib/forms";
import { useCreateProduct, useUpdateProduct } from "@/queries/products";

const DEFAULTS: ProductRequest = {
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
};

export function ProductFormDialog({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product: ProductResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const form = useForm<ProductRequest>({
    resolver: zodResolver(ProductRequestSchema),
    defaultValues: DEFAULTS,
  });
  const { register, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  // Hydrate on open: the edited product, or blank defaults for create.
  useEffect(() => {
    if (!open) return;
    reset(
      product
        ? {
            nameAr: product.nameAr,
            nameLatin: product.nameLatin ?? "",
            barcode: product.barcode ?? "",
            category: product.category as ProductRequest["category"],
            manufacturer: product.manufacturer ?? "",
            supplier: product.supplier ?? "",
            purchasePrice: product.purchasePrice,
            sellingPrice: product.sellingPrice,
            unitOfMeasure: product.unitOfMeasure ?? "",
            expirationDate: product.expirationDate ?? "",
            reorderPoint: product.reorderPoint,
          }
        : DEFAULTS,
    );
  }, [open, product, reset]);

  const onSubmit = handleSubmit((values) => {
    const body = omitEmptyStrings(values); // empty optional text → omitted (stored as null)
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
      create.mutate(
        { ...body, id: newGuidV7() },
        {
          onSuccess: () => {
            toast.success(t("admin.common.created"));
            onClose();
          },
          onError,
        },
      );
    }
  });

  const pending = create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={product ? t("admin.products.editTitle") : t("admin.products.newTitle")}
      className="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("admin.products.nameAr")} error={errors.nameAr?.message}>
            <Input autoFocus {...register("nameAr")} />
          </Field>
          <Field label={t("admin.products.nameLatin")} error={errors.nameLatin?.message}>
            <Input dir="ltr" {...register("nameLatin")} />
          </Field>
          <Field label={t("admin.products.category")} error={errors.category?.message}>
            <Select {...register("category")}>
              <option value="medication">{t("productCategory.medication")}</option>
              <option value="product">{t("productCategory.product")}</option>
            </Select>
          </Field>
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
            <Input type="date" dir="ltr" {...register("expirationDate")} />
          </Field>
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
