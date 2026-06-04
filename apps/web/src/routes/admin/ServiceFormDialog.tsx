import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  newGuidV7,
  ServiceRequestSchema,
  type ApiError,
  type ServiceRequest,
  type ServiceResponse,
} from "@vet/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { omitEmptyStrings } from "@/lib/forms";
import { useCreateService, useUpdateService } from "@/queries/services";

const DEFAULTS: ServiceRequest = {
  nameAr: "",
  nameLatin: "",
  category: "",
  defaultPrice: 0,
};

export function ServiceFormDialog({
  open,
  service,
  onClose,
  defaultName,
  onCreated,
}: {
  open: boolean;
  service: ServiceResponse | null;
  onClose: () => void;
  /** Prefill the Arabic name when opening a fresh form (e.g. the text typed into a picker search). */
  defaultName?: string;
  /** Fired with the new service's id after a create (not an edit) — lets callers select it inline. */
  onCreated?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const create = useCreateService();
  const update = useUpdateService();
  const form = useForm<ServiceRequest>({
    resolver: zodResolver(ServiceRequestSchema),
    defaultValues: DEFAULTS,
  });
  const { register, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      service
        ? {
            nameAr: service.nameAr,
            nameLatin: service.nameLatin ?? "",
            category: service.category ?? "",
            defaultPrice: service.defaultPrice,
          }
        : { ...DEFAULTS, nameAr: defaultName ?? "" },
    );
  }, [open, service, defaultName, reset]);

  const onSubmit = handleSubmit((values) => {
    const body = omitEmptyStrings(values);
    const onError = (e: ApiError) =>
      applyFieldErrors(e, (name, err) => setError(name as never, err));
    if (service) {
      update.mutate(
        { id: service.id, body },
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
          onSuccess: (res) => {
            toast.success(t("admin.common.created"));
            onCreated?.(res.id);
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
      title={service ? t("admin.services.editTitle") : t("admin.services.newTitle")}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("admin.services.nameAr")} error={errors.nameAr?.message}>
            <Input autoFocus {...register("nameAr")} />
          </Field>
          <Field label={t("admin.services.nameLatin")} error={errors.nameLatin?.message}>
            <Input dir="ltr" {...register("nameLatin")} />
          </Field>
          <Field label={t("admin.services.category")} error={errors.category?.message}>
            <Input {...register("category")} />
          </Field>
          <Field label={t("admin.services.defaultPrice")} error={errors.defaultPrice?.message}>
            <Input
              type="number"
              step="0.01"
              dir="ltr"
              {...register("defaultPrice", { valueAsNumber: true })}
            />
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
