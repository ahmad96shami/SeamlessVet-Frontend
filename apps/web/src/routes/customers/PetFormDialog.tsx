import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  PET_SEX_VALUES,
  type ApiError,
  type PetRequest,
  type PetResponse,
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
import { useCreatePet, useUpdatePet } from "@/queries/pets";

// Local form schema (≠ the wire PetRequest): weight is a string from a number input so an empty
// value stays "" rather than NaN; it's parsed to a number at submit. Mirrors AdjustStockDialog.
const PetFormSchema = z.object({
  name: z.string().trim().min(1).max(128),
  species: z.string().trim().max(64),
  breed: z.string().trim().max(128),
  sex: z.enum(["", "male", "female", "unknown"]),
  dateOfBirth: z.string(),
  weightLatest: z
    .string()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), { message: "invalid" }),
  colorMarks: z.string(),
  microchipNo: z.string().trim().max(64),
  healthNotes: z.string(),
});
type PetFormValues = z.infer<typeof PetFormSchema>;

const DEFAULTS: PetFormValues = {
  name: "",
  species: "",
  breed: "",
  sex: "",
  dateOfBirth: "",
  weightLatest: "",
  colorMarks: "",
  microchipNo: "",
  healthNotes: "",
};

export function PetFormDialog({
  open,
  customerId,
  pet,
  onClose,
}: {
  open: boolean;
  customerId: string;
  pet: PetResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreatePet();
  const update = useUpdatePet();
  const form = useForm<PetFormValues>({ resolver: zodResolver(PetFormSchema), defaultValues: DEFAULTS });
  const { register, control, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      pet
        ? {
            name: pet.name,
            species: pet.species ?? "",
            breed: pet.breed ?? "",
            sex: (pet.sex ?? "") as PetFormValues["sex"],
            dateOfBirth: pet.dateOfBirth ?? "",
            weightLatest: pet.weightLatest != null ? String(pet.weightLatest) : "",
            colorMarks: pet.colorMarks ?? "",
            microchipNo: pet.microchipNo ?? "",
            healthNotes: pet.healthNotes ?? "",
          }
        : DEFAULTS,
    );
  }, [open, pet, reset]);

  const onSubmit = handleSubmit((v) => {
    const body: PetRequest = {
      customerId,
      name: v.name,
      species: v.species || undefined,
      breed: v.breed || undefined,
      sex: v.sex || undefined,
      dateOfBirth: v.dateOfBirth || undefined,
      colorMarks: v.colorMarks || undefined,
      weightLatest: v.weightLatest ? Number(v.weightLatest) : undefined,
      microchipNo: v.microchipNo || undefined,
      healthNotes: v.healthNotes || undefined,
    };
    const onError = (e: ApiError) =>
      applyFieldErrors(e, (name, err) => setError(name as never, err));
    if (pet) {
      update.mutate(
        { id: pet.id, body },
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
      title={pet ? t("customers.pets.editTitle") : t("customers.pets.newTitle")}
      className="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("customers.pets.name")} error={errors.name?.message}>
            <Input autoFocus {...register("name")} />
          </Field>
          <Field label={t("customers.pets.species")} error={errors.species?.message}>
            <Input {...register("species")} />
          </Field>
          <Field label={t("customers.pets.breed")} error={errors.breed?.message}>
            <Input {...register("breed")} />
          </Field>
          <Field label={t("customers.pets.sex")} error={errors.sex?.message}>
            <Controller
              name="sex"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)}>
                  <option value="">{t("customers.pets.sexUnset")}</option>
                  {PET_SEX_VALUES.map((s) => (
                    <option key={s} value={s}>
                      {t(`petSex.${s}`)}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
          <Field label={t("customers.pets.dateOfBirth")} error={errors.dateOfBirth?.message}>
            <Input type="date" dir="ltr" {...register("dateOfBirth")} />
          </Field>
          <Field label={t("customers.pets.weightLatest")} error={errors.weightLatest?.message}>
            <Input type="number" step="0.001" min="0" dir="ltr" {...register("weightLatest")} />
          </Field>
          <Field label={t("customers.pets.colorMarks")} error={errors.colorMarks?.message}>
            <Input {...register("colorMarks")} />
          </Field>
          <Field label={t("customers.pets.microchipNo")} error={errors.microchipNo?.message}>
            <Input dir="ltr" {...register("microchipNo")} />
          </Field>
        </div>
        <Field label={t("customers.pets.healthNotes")} error={errors.healthNotes?.message}>
          <Textarea rows={2} {...register("healthNotes")} />
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
