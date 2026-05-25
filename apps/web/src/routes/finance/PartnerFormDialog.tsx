import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  type ApiError,
  type PartnerCreateRequest,
  type PartnerPatchRequest,
  type PartnerResponse,
  type UserResponse,
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
import { Textarea } from "@/components/ui/textarea";
import { useCreatePartner, useUpdatePartner } from "@/queries/partnership";

const FormSchema = z.object({
  displayName: z.string().trim().min(1).max(256),
  userId: z.string(),
  notes: z.string(),
});
type FormValues = z.infer<typeof FormSchema>;

const DEFAULTS: FormValues = { displayName: "", userId: "", notes: "" };
const text = (s: string): string | undefined => (s.trim() === "" ? undefined : s.trim());

export function PartnerFormDialog({
  open,
  partner,
  users,
  onClose,
}: {
  open: boolean;
  partner: PartnerResponse | null;
  users: UserResponse[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreatePartner();
  const update = useUpdatePartner();
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });
  const { register, control, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      partner
        ? { displayName: partner.displayName, userId: partner.userId ?? "", notes: partner.notes ?? "" }
        : DEFAULTS,
    );
  }, [open, partner, reset]);

  const onSubmit = handleSubmit((values) => {
    const onError = (e: ApiError) => applyFieldErrors(e, (name, err) => setError(name as never, err));
    const body = { displayName: values.displayName, userId: text(values.userId), notes: text(values.notes) };
    if (partner) {
      update.mutate(
        { id: partner.id, body: body as PartnerPatchRequest },
        {
          onSuccess: () => {
            toast.success(t("admin.common.updated"));
            onClose();
          },
          onError,
        },
      );
    } else {
      create.mutate(body as PartnerCreateRequest, {
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
      title={partner ? t("finance.partners.editTitle") : t("finance.partners.newTitle")}
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t("finance.partners.displayName")} error={errors.displayName?.message}>
          <Input autoFocus {...register("displayName")} />
        </Field>
        <Field label={t("finance.partners.linkedUser")} error={errors.userId?.message}>
          <Controller
            name="userId"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                <option value="">{t("finance.partners.noUser")}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </Select>
            )}
          />
        </Field>
        <Field label={t("finance.partners.notes")} error={errors.notes?.message}>
          <Textarea {...register("notes")} rows={2} />
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
