import { useMemo } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  VaccinationCreateRequestSchema,
  type VaccinationCreateRequest,
} from "@vet/shared";

import { Button, Card, IconTile, ListRow, Money, Pill } from "@/components/ui";
import { ChipSelect, FormField } from "@/components/forms";
import { Check, Syringe } from "@/components/icons";
import { dialog } from "@/stores/dialogStore";
import { colors } from "@/theme";

/** A vaccine the doctor carries in the field (a product of category 'vaccine' with field stock). */
export interface VaccineProductOption {
  id: string;
  name: string;
  price: number | null;
  onHand: number;
  /** Field-inventory location to deduct the dose from (always set — the list is field stock). */
  fieldLocationId: string | null;
}

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
  /**
   * Mo11 (M26) — the vaccine catalog to administer from: products of category 'vaccine' that the
   * doctor carries in the field. Provided in **create** mode (picking one links `productId`, sets
   * the `vaccineType` snapshot + `price`, and deducts a dose FEFO). Omitted in **edit** mode — the
   * catalog link is immutable once recorded (stock already moved), so the form shows the recorded
   * vaccine name read-only.
   */
  vaccineProducts?: ReadonlyArray<VaccineProductOption>;
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
 * Shared create + edit form for a vaccination (Mo2.5; Mo11 vaccines-as-products).
 *
 * Recipient is either a single `petId` or the visit's `customerId` alone — the latter is the
 * **farm-group vaccination** case from SCHEMA.md, where one record covers the herd. The "—" clear
 * chip on the pet selector maps to that.
 *
 * The vaccine is picked from the doctor's field stock (`vaccineProducts`); the pick links the
 * catalog product and the screen deducts a dose on save. Date fields are typed as `YYYY-MM-DD`
 * plain text (matches `PetForm`, no native datetime-picker dep). Server enforces
 * `nextDueDate >= dateGiven`; the client only validates non-empty for `dateGiven`.
 */
export function VaccinationForm({
  customerId,
  visitId,
  pets,
  lockRecipient,
  vaccineProducts,
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
      productId: undefined,
      vaccineType: defaultValues?.vaccineType ?? "",
      dateGiven: defaultValues?.dateGiven ?? today,
      nextDueDate: defaultValues?.nextDueDate ?? "",
    },
  });

  // Re-render the vaccine list when the selection changes (drives the teal ring + the schema's
  // vaccineType, set on pick — so the resolver passes once a vaccine is chosen).
  const productId = form.watch("productId");

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({
        ...values,
        // The form keeps `nextDueDate` as "" when blank; drop it so the schema's optional()
        // is honoured (otherwise the empty string would round-trip to the server).
        nextDueDate: values.nextDueDate?.trim() ? values.nextDueDate : undefined,
      });
    } catch (err) {
      void dialog.alert(t("visits.vaccinations.add"), (err as Error).message ?? "Save failed");
    }
  });

  const pickVaccine = (p: VaccineProductOption) => {
    form.setValue("productId", p.id);
    form.setValue("vaccineType", p.name, { shouldValidate: true });
    form.setValue("price", p.price ?? undefined);
  };

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

      {/* Vaccine — a field-stock product picker on create; the recorded name read-only on edit. */}
      {vaccineProducts ? (
        <View className="gap-2">
          <Text className="text-ink-700 text-[13px] font-tajawal-bold">
            {t("visits.vaccinations.vaccine")}
          </Text>
          {vaccineProducts.length === 0 ? (
            <Card flat className="p-3">
              <Text className="text-ink-500 text-center text-[13px] font-tajawal">
                {t("visits.vaccinations.noStock")}
              </Text>
            </Card>
          ) : (
            vaccineProducts.map((p) => {
              const selected = productId === p.id;
              return (
                <ListRow key={p.id} selected={selected} onPress={() => pickVaccine(p)}>
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-pill border ${
                      selected ? "bg-teal-500 border-teal-500" : "border-ink-200 bg-paper"
                    }`}
                  >
                    {selected ? <Check size={14} color={colors.white} /> : null}
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-navy-900 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
                      {p.name}
                    </Text>
                    <View className="mt-0.5 flex-row flex-wrap items-center gap-1.5">
                      {p.price != null ? <Money value={p.price} dim className="text-[13px]" /> : null}
                      <Pill tone="neutral" compact label={t("visits.wizard.available", { n: p.onHand })} />
                    </View>
                  </View>
                  <IconTile>
                    <Syringe size={20} color={colors.teal[600]} />
                  </IconTile>
                </ListRow>
              );
            })
          )}
          {form.formState.errors.vaccineType ? (
            <Text className="text-rose-ink text-[12px] font-tajawal-bold">
              {t("visits.vaccinations.selectVaccine")}
            </Text>
          ) : null}
        </View>
      ) : (
        <View className="gap-1">
          <Text className="text-ink-700 text-[13px] font-tajawal-bold">
            {t("visits.vaccinations.vaccine")}
          </Text>
          <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
            {defaultValues?.vaccineType ?? "—"}
          </Text>
        </View>
      )}

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
