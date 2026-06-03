import { useMemo } from "react";
import { Alert, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  VaccinationCreateRequestSchema,
  type VaccinationCreateRequest,
} from "@vet/shared";

import { Button } from "@/components/ui";
import { ChipSelect, FormField } from "@/components/forms";

interface VaccinationFormProps {
  /** Customer the vaccination is recorded against — always set (visit's customer). */
  customerId: string;
  /** Visit it's logged on (optional in DB; standalone records pass none — Mo9.2). */
  visitId?: string;
  /** Pets on the customer — lets the doctor pick one or fall back to a farm-group record. */
  pets: ReadonlyArray<{ id: string; name: string }>;
  /**
   * Freeze the recipient (edit mode). The `/sync/vaccinations` PATCH handler silently ignores
   * `pet_id`/`customer_id` (immutable post-create, like web W13's dialog) — an editable selector
   * here would change the local row only for the server to re-stream the original.
   */
  lockRecipient?: boolean;
  /** Edit defaults. */
  defaultValues?: {
    petId?: string | null;
    vaccineType?: string;
    dateGiven?: string;
    nextDueDate?: string;
  };
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: VaccinationCreateRequest) => Promise<void> | void;
}

/**
 * Shared create + edit form for a vaccination on a field visit (Mo2.5).
 *
 * Recipient is either a single `petId` or the visit's `customerId` alone — the latter is the
 * **farm-group vaccination** case from SCHEMA.md, where one record covers the herd (e.g. mass
 * cattle vaccination on a farm visit). The "—" clear chip on the pet selector maps to that.
 *
 * Date fields are typed as `YYYY-MM-DD` plain text — matches the existing `PetForm` pattern,
 * keeps the bundle free of an extra native datetime-picker dep (no Mo2 native rebuild needed).
 * Server enforces `nextDueDate >= dateGiven`; client only validates non-empty for `dateGiven`.
 */
export function VaccinationForm({
  customerId,
  visitId,
  pets,
  lockRecipient,
  defaultValues,
  submitting,
  submitLabel,
  onSubmit,
}: VaccinationFormProps) {
  const { t } = useTranslation();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const form = useForm<VaccinationCreateRequest>({
    resolver: zodResolver(VaccinationCreateRequestSchema),
    defaultValues: {
      customerId,
      visitId,
      petId: defaultValues?.petId ?? undefined,
      vaccineType: defaultValues?.vaccineType ?? "",
      dateGiven: defaultValues?.dateGiven ?? today,
      nextDueDate: defaultValues?.nextDueDate ?? "",
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        ...values,
        // The form keeps `nextDueDate` as "" when blank; drop it so the schema's optional()
        // is honoured (otherwise the empty string would round-trip to the server).
        nextDueDate: values.nextDueDate?.trim() ? values.nextDueDate : undefined,
      });
    } catch (err) {
      Alert.alert(t("visits.vaccinations.add"), (err as Error).message ?? "Save failed");
    }
  });

  const lockedPetName = useMemo(() => {
    const petId = defaultValues?.petId;
    if (!petId) return null;
    return pets.find((p) => p.id === petId)?.name ?? null;
  }, [defaultValues?.petId, pets]);

  return (
    <View className="gap-4">
      {lockRecipient ? (
        <View className="gap-1">
          <Text className="text-ink-700 text-[13px] font-tajawal-bold">
            {t("vaccinations.form.recipient")}
          </Text>
          <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
            {lockedPetName ?? t("vaccinations.recipientFarm")}
          </Text>
        </View>
      ) : pets.length > 0 ? (
        <ChipSelect
          control={form.control}
          name="petId"
          label={t("visits.create.pet")}
          options={pets.map((p) => ({ value: p.id, label: p.name }))}
          allowClear
          clearLabel={t("visits.vaccinations.farmGroup", { defaultValue: "مجموعة (المزرعة)" })}
        />
      ) : null}

      <FormField
        control={form.control}
        name="vaccineType"
        label={t("visits.vaccinations.vaccineType")}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            control={form.control}
            name="dateGiven"
            label={t("visits.vaccinations.dateGiven")}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
        </View>
        <View className="flex-1">
          <FormField
            control={form.control}
            name="nextDueDate"
            label={t("visits.vaccinations.nextDueDate")}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View className="mt-2">
        <Button label={submitLabel} onPress={handleSubmit} loading={submitting} block />
      </View>
    </View>
  );
}
