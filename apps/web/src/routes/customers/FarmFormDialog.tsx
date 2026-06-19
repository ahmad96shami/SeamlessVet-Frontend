import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  FARM_KIND_VALUES,
  type ApiError,
  type FarmRequest,
  type FarmResponse,
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
import { useCreateFarm, useUpdateFarm } from "@/queries/farms";

const FARM_KINDS = FARM_KIND_VALUES as [string, ...string[]];

// Local form schema (≠ the wire FarmRequest): headCount is a string from a number input so an empty
// value stays "" rather than NaN; it's parsed to a number at submit. Mirrors PetFormDialog.
const FarmFormSchema = z.object({
  name: z.string().trim().min(1).max(128),
  kind: z.enum(FARM_KINDS),
  location: z.string(),
  animalType: z.string().trim().max(64),
  headCount: z
    .string()
    .refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0), { message: "invalid" }),
  notes: z.string(),
});
type FarmFormValues = z.infer<typeof FarmFormSchema>;

const DEFAULTS: FarmFormValues = {
  name: "",
  kind: "poultry",
  location: "",
  animalType: "",
  headCount: "",
  notes: "",
};

export function FarmFormDialog({
  open,
  customerId,
  farm,
  defaultName,
  onClose,
  onCreated,
}: {
  open: boolean;
  customerId: string;
  farm: FarmResponse | null;
  /** Prefill the name on create (e.g. the combobox "add «term»" flow). */
  defaultName?: string;
  onClose: () => void;
  /** Fired with the new farm's id after a successful create (lets callers auto-select it). */
  onCreated?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const create = useCreateFarm();
  const update = useUpdateFarm();
  const form = useForm<FarmFormValues>({
    resolver: zodResolver(FarmFormSchema),
    defaultValues: DEFAULTS,
  });
  const { register, control, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      farm
        ? {
            name: farm.name,
            kind: (farm.kind as FarmFormValues["kind"]) ?? "poultry",
            location: farm.location ?? "",
            animalType: farm.animalType ?? "",
            headCount: farm.headCount != null ? String(farm.headCount) : "",
            notes: farm.notes ?? "",
          }
        : { ...DEFAULTS, name: defaultName ?? "" },
    );
  }, [open, farm, defaultName, reset]);

  const onSubmit = handleSubmit((v) => {
    const body: FarmRequest = {
      customerId,
      name: v.name,
      kind: v.kind as FarmRequest["kind"],
      location: v.location || undefined,
      animalType: v.animalType || undefined,
      headCount: v.headCount ? Number(v.headCount) : undefined,
      notes: v.notes || undefined,
    };
    const onError = (e: ApiError) =>
      applyFieldErrors(e, (name, err) => setError(name as never, err));
    if (farm) {
      update.mutate(
        { id: farm.id, body },
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
        onSuccess: (res) => {
          toast.success(t("admin.common.created"));
          onCreated?.(res.id);
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
      title={farm ? t("customers.farms.editTitle") : t("customers.farms.newTitle")}
      className="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("customers.farms.name")} error={errors.name?.message}>
            <Input autoFocus {...register("name")} />
          </Field>
          <Field label={t("customers.farms.kind")} error={errors.kind?.message}>
            <Controller
              name="kind"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  {FARM_KIND_VALUES.map((k) => (
                    <option key={k} value={k}>
                      {t(`farmKind.${k}`)}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
          <Field label={t("customers.farms.animalType")} error={errors.animalType?.message}>
            <Input {...register("animalType")} />
          </Field>
          <Field label={t("customers.farms.headCount")} error={errors.headCount?.message}>
            <Input type="number" step="1" min="0" dir="ltr" {...register("headCount")} />
          </Field>
        </div>
        <Field label={t("customers.farms.location")} error={errors.location?.message}>
          <Input {...register("location")} />
        </Field>
        <Field label={t("customers.farms.notes")} error={errors.notes?.message}>
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
