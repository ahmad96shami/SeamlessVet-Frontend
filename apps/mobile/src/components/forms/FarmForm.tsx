import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FARM_KIND_VALUES,
  FarmRequestSchema,
  type FarmRequest,
} from "@vet/shared";

import { Button } from "@/components/ui";
import { ChipSelect, FormField, NumberFieldTransform } from "@/components/forms";
import { omitEmptyStrings } from "@/lib/forms";
import { dialog } from "@/stores/dialogStore";

interface FarmFormProps {
  customerId: string;
  defaultValues?: Partial<FarmRequest>;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: FarmRequest) => Promise<void> | void;
}

/**
 * Shared create + edit form for a farm under a customer (M15 — farms attach like pets and
 * inherit the customer's doctor scope). Uses the shared `FarmRequestSchema` so the offline
 * form enforces the same rules as the web admin (W11). `customerId` is fixed by the route —
 * a farm never moves between customers from the field.
 */
export function FarmForm({
  customerId,
  defaultValues,
  submitting,
  submitLabel,
  onSubmit,
}: FarmFormProps) {
  const { t } = useTranslation();
  const form = useForm<FarmRequest>({
    resolver: zodResolver(FarmRequestSchema),
    defaultValues: {
      customerId,
      name: defaultValues?.name ?? "",
      kind: defaultValues?.kind ?? "other",
      location: defaultValues?.location ?? "",
      animalType: defaultValues?.animalType ?? "",
      headCount: defaultValues?.headCount,
      notes: defaultValues?.notes ?? "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(omitEmptyStrings(values));
    } catch (err) {
      void dialog.alert(t("actions.save"), (err as Error).message ?? "Save failed");
    }
  });

  return (
    <View className="gap-4">
      <FormField control={form.control} name="name" label={t("customers.farms.name")} />
      <ChipSelect
        control={form.control}
        name="kind"
        label={t("customers.farms.kind")}
        options={FARM_KIND_VALUES.map((v) => ({ value: v, label: t(`farmKind.${v}`) }))}
      />
      <FormField control={form.control} name="location" label={t("customers.farms.location")} />
      <FormField
        control={form.control}
        name="animalType"
        label={t("customers.farms.animalType")}
      />
      <FormField
        control={form.control}
        name="headCount"
        label={t("customers.farms.headCount")}
        keyboardType="numeric"
        transform={NumberFieldTransform}
      />
      <FormField
        control={form.control}
        name="notes"
        label={t("customers.farms.notes")}
        multiline
      />

      <View className="mt-2">
        <Button label={submitLabel} onPress={handleSubmit} loading={submitting} block />
      </View>
    </View>
  );
}
