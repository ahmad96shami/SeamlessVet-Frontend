import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PET_SEX_VALUES,
  PetRequestSchema,
  type PetRequest,
} from "@vet/shared";

import { Button } from "@/components/ui";
import { ChipSelect, FormField, NumberFieldTransform } from "@/components/forms";
import { omitEmptyStrings } from "@/lib/forms";

interface PetFormProps {
  customerId: string;
  defaultValues?: Partial<PetRequest>;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: PetRequest) => Promise<void> | void;
}

/**
 * Shared create + edit form for a pet under a customer (PRD §5.1). Uses the shared
 * `PetRequestSchema` so the field-doctor's offline form has the same rules the web admin uses.
 * `customerId` is fixed by the route — it's not editable from the pet form (use the dedicated
 * pet-transfer flow once Mo6+ ports it from web W3).
 */
export function PetForm({
  customerId,
  defaultValues,
  submitting,
  submitLabel,
  onSubmit,
}: PetFormProps) {
  const { t } = useTranslation();
  const form = useForm<PetRequest>({
    resolver: zodResolver(PetRequestSchema),
    defaultValues: {
      customerId,
      name: defaultValues?.name ?? "",
      species: defaultValues?.species ?? "",
      breed: defaultValues?.breed ?? "",
      sex: defaultValues?.sex,
      dateOfBirth: defaultValues?.dateOfBirth ?? "",
      colorMarks: defaultValues?.colorMarks ?? "",
      weightLatest: defaultValues?.weightLatest,
      microchipNo: defaultValues?.microchipNo ?? "",
      healthNotes: defaultValues?.healthNotes ?? "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(omitEmptyStrings(values));
    } catch (err) {
      Alert.alert(t("actions.save"), (err as Error).message ?? "Save failed");
    }
  });

  return (
    <View className="gap-4">
      <FormField control={form.control} name="name" label={t("customers.pets.name")} />
      <FormField control={form.control} name="species" label={t("customers.pets.species")} />
      <FormField control={form.control} name="breed" label={t("customers.pets.breed")} />
      <ChipSelect
        control={form.control}
        name="sex"
        label={t("customers.pets.sex")}
        options={PET_SEX_VALUES.map((v) => ({ value: v, label: t(`petSex.${v}`) }))}
        allowClear
        clearLabel={t("customers.pets.sexUnset")}
      />
      <FormField
        control={form.control}
        name="dateOfBirth"
        label={t("customers.pets.dateOfBirth")}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      <FormField
        control={form.control}
        name="weightLatest"
        label={t("customers.pets.weightLatest")}
        keyboardType="decimal-pad"
        transform={NumberFieldTransform}
      />
      <FormField control={form.control} name="colorMarks" label={t("customers.pets.colorMarks")} />
      <FormField
        control={form.control}
        name="microchipNo"
        label={t("customers.pets.microchipNo")}
        autoCapitalize="none"
      />
      <FormField
        control={form.control}
        name="healthNotes"
        label={t("customers.pets.healthNotes")}
        multiline
      />

      <View className="mt-2">
        <Button label={submitLabel} onPress={handleSubmit} loading={submitting} block />
      </View>
    </View>
  );
}
