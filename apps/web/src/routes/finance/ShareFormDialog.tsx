import { zodResolver } from "@hookform/resolvers/zod";
import {
  type ApiError,
  type PartnershipShareCreateRequest,
  type PartnershipSharePatchRequest,
  type PartnershipShareResponse,
  type PartnerResponse,
} from "@vet/shared";
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
import { useCreatePartnershipShare, useUpdatePartnershipShare } from "@/queries/partnership";

const FormSchema = z.object({
  partnerId: z.string().min(1),
  sharePercent: z.string(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string(),
});
type FormValues = z.infer<typeof FormSchema>;

const DEFAULTS: FormValues = { partnerId: "", sharePercent: "", effectiveFrom: "", effectiveTo: "" };
const text = (s: string): string | undefined => (s.trim() === "" ? undefined : s.trim());

export function ShareFormDialog({
  open,
  share,
  partners,
  onClose,
}: {
  open: boolean;
  share: PartnershipShareResponse | null;
  partners: PartnerResponse[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreatePartnershipShare();
  const update = useUpdatePartnershipShare();
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });
  const { register, control, handleSubmit, reset, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      share
        ? {
            partnerId: share.partnerId,
            sharePercent: String(share.sharePercent),
            effectiveFrom: share.effectiveFrom,
            effectiveTo: share.effectiveTo ?? "",
          }
        : DEFAULTS,
    );
  }, [open, share, reset]);

  // The ≤100% invariant is server-enforced (409 `partnership_overallocated`); explain it on conflict.
  const onError = (e: ApiError) =>
    toast.error(e.code === "partnership_overallocated" ? t("finance.partners.shares.exceededError") : e.message);

  const onSubmit = handleSubmit((values) => {
    const percent = Number(values.sharePercent || 0);
    if (share) {
      const body: PartnershipSharePatchRequest = {
        sharePercent: percent,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: text(values.effectiveTo),
      };
      update.mutate(
        { id: share.id, body },
        {
          onSuccess: () => {
            toast.success(t("admin.common.updated"));
            onClose();
          },
          onError,
        },
      );
    } else {
      const body: PartnershipShareCreateRequest = {
        partnerId: values.partnerId,
        sharePercent: percent,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: text(values.effectiveTo),
      };
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
      title={share ? t("finance.partners.shares.editTitle") : t("finance.partners.shares.addTitle")}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t("finance.partners.shares.partner")} error={errors.partnerId?.message}>
          <Controller
            name="partnerId"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                disabled={share != null}
              >
                <option value="">—</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </Select>
            )}
          />
        </Field>
        <Field label={t("finance.partners.shares.sharePercent")} error={errors.sharePercent?.message}>
          <Input type="number" step="0.01" min="0" max="100" dir="ltr" {...register("sharePercent")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("finance.partners.shares.effectiveFrom")} error={errors.effectiveFrom?.message}>
            <Input type="date" dir="ltr" {...register("effectiveFrom")} />
          </Field>
          <Field label={t("finance.partners.shares.effectiveTo")} error={errors.effectiveTo?.message}>
            <Input type="date" dir="ltr" {...register("effectiveTo")} />
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
