import { zodResolver } from "@hookform/resolvers/zod";
import { applyFieldErrors, type ApiError, type DoctorPartnerResponse } from "@vet/shared";
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
import { useDoctors } from "@/queries/doctors";
import { useCreateDoctorPartner, useUpdateDoctorPartner } from "@/queries/doctorPartners";

// The linked doctor (a user) is mandatory and fixed at creation; only notes are patchable afterwards.
const FormSchema = z.object({
  userId: z.string().min(1),
  notes: z.string().trim().optional(),
});
type FormValues = z.infer<typeof FormSchema>;

const DEFAULTS: FormValues = { userId: "", notes: "" };

export function DoctorPartnerFormDialog({
  open,
  partner,
  onClose,
}: {
  open: boolean;
  partner: DoctorPartnerResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const doctors = useDoctors();
  const create = useCreateDoctorPartner();
  const update = useUpdateDoctorPartner();
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });
  const { register, control, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(partner ? { userId: partner.userId, notes: partner.notes ?? "" } : DEFAULTS);
  }, [open, partner, reset]);

  const onError = (e: ApiError) => {
    if (e.fieldErrors) applyFieldErrors(e, (name, err) => setError(name as never, err));
  };

  const onSubmit = handleSubmit((values) => {
    const notes = values.notes?.trim() ? values.notes.trim() : undefined;
    if (partner) {
      update.mutate(
        { id: partner.id, body: { notes } },
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
        { userId: values.userId, notes },
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
      title={partner ? t("doctorPartners.editTitle") : t("doctorPartners.newTitle")}
      className="max-w-lg"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label={t("doctorPartners.doctor")} error={errors.userId?.message}>
          {partner ? (
            // The user link is fixed after creation — show the resolved name read-only.
            <Input value={partner.doctorName} disabled readOnly />
          ) : (
            <Controller
              name="userId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  <option value="">{t("doctorPartners.doctorPlaceholder")}</option>
                  {(doctors.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              )}
            />
          )}
        </Field>
        {partner ? null : (
          <p className="text-xs text-muted-foreground">{t("doctorPartners.doctorFixed")}</p>
        )}
        <Field label={t("doctorPartners.notes")} error={errors.notes?.message}>
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
