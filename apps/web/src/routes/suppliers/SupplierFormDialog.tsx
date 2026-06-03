import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  SupplierRequestSchema,
  type ApiError,
  type SupplierRequest,
  type SupplierResponse,
} from "@vet/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { omitEmptyStrings } from "@/lib/forms";
import { useCreateSupplier, useUpdateSupplier } from "@/queries/suppliers";

const DEFAULTS: SupplierRequest = {
  name: "",
  phonePrimary: "",
  phoneSecondary: "",
  address: "",
  email: "",
  taxNumber: "",
  notes: "",
};

export function SupplierFormDialog({
  open,
  supplier,
  onClose,
}: {
  open: boolean;
  supplier: SupplierResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateSupplier();
  const update = useUpdateSupplier();
  const form = useForm<SupplierRequest>({
    resolver: zodResolver(SupplierRequestSchema),
    defaultValues: DEFAULTS,
  });
  const { register, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      supplier
        ? {
            name: supplier.name,
            phonePrimary: supplier.phonePrimary ?? "",
            phoneSecondary: supplier.phoneSecondary ?? "",
            address: supplier.address ?? "",
            email: supplier.email ?? "",
            taxNumber: supplier.taxNumber ?? "",
            notes: supplier.notes ?? "",
          }
        : DEFAULTS,
    );
  }, [open, supplier, reset]);

  const onSubmit = handleSubmit((values) => {
    const body = omitEmptyStrings(values); // empty optional text → omitted (stored as null)
    const onError = (e: ApiError) =>
      applyFieldErrors(e, (name, err) => setError(name as never, err));
    if (supplier) {
      update.mutate(
        { id: supplier.id, body },
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
      title={supplier ? t("suppliers.editTitle") : t("suppliers.newTitle")}
      className="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("suppliers.name")} error={errors.name?.message}>
            <Input autoFocus {...register("name")} />
          </Field>
          <Field label={t("suppliers.taxNumber")} error={errors.taxNumber?.message}>
            <Input dir="ltr" {...register("taxNumber")} />
          </Field>
          <Field label={t("suppliers.phonePrimary")} error={errors.phonePrimary?.message}>
            <Input dir="ltr" {...register("phonePrimary")} />
          </Field>
          <Field label={t("suppliers.phoneSecondary")} error={errors.phoneSecondary?.message}>
            <Input dir="ltr" {...register("phoneSecondary")} />
          </Field>
          <Field label={t("suppliers.email")} error={errors.email?.message}>
            <Input dir="ltr" {...register("email")} />
          </Field>
        </div>
        <Field label={t("suppliers.address")} error={errors.address?.message}>
          <Textarea rows={2} {...register("address")} />
        </Field>
        <Field label={t("suppliers.notes")} error={errors.notes?.message}>
          <Textarea rows={2} {...register("notes")} />
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
