import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PrescriptionCreateRequestSchema,
  type PrescriptionCreateRequest,
} from "@vet/shared";

import { Search } from "@/components/icons";
import { Button, Card, Input, Pill } from "@/components/ui";
import { FormField, NumberFieldTransform } from "@/components/forms";
import { useQuery } from "@/sync/hooks";
import type { ProductRow } from "@/sync/types";

interface PrescriptionFormProps {
  visitId: string;
  /** Edit mode: product / quantity / dispense type are immutable post-create (server rule). */
  defaultValues?: {
    productId?: string;
    dispenseType?: "administered_in_clinic" | "dispensed_to_owner";
    quantity?: number;
    dosage?: string;
    frequency?: string;
    duration?: string;
    notes?: string;
  };
  /** When true the product/qty fields are locked (edit mode). */
  lockClinical?: boolean;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: PrescriptionCreateRequest) => Promise<void> | void;
}

/**
 * Shared create + edit form for a prescription on a field visit (Mo2.4).
 *
 * On the field client this is the *clinical record* the doctor gave the owner —
 * `dispense_type` is hard-defaulted to `dispensed_to_owner` (per MOBILE.md Mo2 deliverable;
 * the field doctor doesn't dispense in-clinic). Writing this row through `/sync/prescriptions`
 * does **not** deduct field inventory and does **not** post to the ledger — both happen
 * server-side at Mo4 `POST /visits/{id}/field-invoice` issuance, keeping money + inventory
 * rules server-authoritative (the universal rule, SCHEMA invariant #5).
 *
 * Edit mode locks product / quantity / dispense type — those are immutable post-create on
 * the server (see PrescriptionsSyncHandler.PatchAsync) because they carry the deferred
 * billing meaning the Mo4 invoice will assemble against.
 */
export function PrescriptionForm({
  visitId,
  defaultValues,
  lockClinical,
  submitting,
  submitLabel,
  onSubmit,
}: PrescriptionFormProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const form = useForm<PrescriptionCreateRequest>({
    resolver: zodResolver(PrescriptionCreateRequestSchema),
    defaultValues: {
      visitId,
      productId: defaultValues?.productId ?? "",
      dispenseType: defaultValues?.dispenseType ?? "dispensed_to_owner",
      quantity: defaultValues?.quantity,
      dosage: defaultValues?.dosage ?? "",
      frequency: defaultValues?.frequency ?? "",
      duration: defaultValues?.duration ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });
  const selectedProductId = form.watch("productId");

  // Local catalog from PowerSync. Filter to medications — field prescriptions are only meds;
  // services rendered already live on `procedures`. Falls open to all products if the
  // category column happens to be null for an environment that hasn't categorised yet.
  const { data: products } = useQuery<ProductRow>(
    `SELECT * FROM products ORDER BY name_ar LIMIT 400`,
  );
  const meds = useMemo(() => {
    const all = products ?? [];
    const m = all.filter((p) => p.category === "medication");
    return m.length > 0 ? m : all;
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meds;
    return meds.filter(
      (p) =>
        p.name_ar.toLowerCase().includes(q)
        || (p.name_latin ?? "").toLowerCase().includes(q)
        || (p.barcode ?? "").toLowerCase().includes(q),
    );
  }, [meds, search]);

  const selectedProduct = useMemo(
    () => (products ?? []).find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      Alert.alert(t("visits.prescriptions.add"), (err as Error).message ?? "Save failed");
    }
  });

  return (
    <View className="gap-4">
      <Text className="text-ink-700 text-[13px] font-tajawal-bold">
        {t("visits.prescriptions.product")}
      </Text>

      {lockClinical ? (
        <Card flat className="p-3">
          <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
            {selectedProduct?.name_ar ?? t("visits.prescriptions.selectProduct")}
          </Text>
          {selectedProduct?.unit_of_measure ? (
            <Text className="text-ink-500 mt-0.5 text-[12px] font-tajawal">
              {selectedProduct.unit_of_measure}
            </Text>
          ) : null}
        </Card>
      ) : (
        <>
          <Input
            placeholder={t("customers.searchPlaceholder")}
            value={search}
            onChangeText={setSearch}
            leading={<Search size={18} color="#94A1B5" />}
            autoCapitalize="none"
          />

          <FlatList
            scrollEnabled={false}
            data={filtered.slice(0, 50)}
            keyExtractor={(p) => p.id}
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={({ item }) => (
              <Pressable onPress={() => form.setValue("productId", item.id)}>
                <Card
                  className="flex-row items-center gap-3 p-3"
                  style={
                    selectedProductId === item.id
                      ? { borderColor: "#0F7A8A", borderWidth: 1.5 }
                      : undefined
                  }
                >
                  <View className="flex-1 gap-1">
                    <Text
                      className="text-navy-900 text-[14px] font-tajawal-extrabold"
                      numberOfLines={1}
                    >
                      {item.name_ar}
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {item.unit_of_measure ? (
                        <Pill tone="neutral" label={item.unit_of_measure} />
                      ) : null}
                    </View>
                  </View>
                </Card>
              </Pressable>
            )}
            ListEmptyComponent={
              <Card flat className="p-3">
                <Text className="text-ink-500 text-center text-[13px] font-tajawal">
                  {t("visits.prescriptions.empty")}
                </Text>
              </Card>
            }
          />
        </>
      )}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            control={form.control}
            name="quantity"
            label={t("visits.prescriptions.quantity")}
            keyboardType="decimal-pad"
            transform={NumberFieldTransform}
          />
        </View>
        <View className="flex-1">
          <FormField
            control={form.control}
            name="dosage"
            label={t("visits.prescriptions.dosage")}
          />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            control={form.control}
            name="frequency"
            label={t("visits.prescriptions.frequency")}
          />
        </View>
        <View className="flex-1">
          <FormField
            control={form.control}
            name="duration"
            label={t("visits.prescriptions.duration")}
          />
        </View>
      </View>
      <FormField
        control={form.control}
        name="notes"
        label={t("visits.prescriptions.notes")}
        multiline
      />

      <View className="mt-2">
        <Button label={submitLabel} onPress={handleSubmit} loading={submitting} block />
      </View>
    </View>
  );
}
