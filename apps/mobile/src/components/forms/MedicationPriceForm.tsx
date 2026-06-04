import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ContractMedicationPriceCreateRequestSchema,
  formatCurrency,
  type ContractMedicationPriceCreateRequest,
} from "@vet/shared";

import { Search } from "@/components/icons";
import { Button, Card, Input, Pill } from "@/components/ui";
import { FormField, NumberFieldTransform } from "@/components/forms";
import { useQuery } from "@/sync/hooks";
import type { ProductRow } from "@/sync/types";
import { colors } from "@/theme";

interface MedicationPriceFormProps {
  /** Products already overridden on this contract — hidden from the create picker (one row per product). */
  usedProductIds?: string[];
  defaultValues?: { productId?: string; contractPrice?: number };
  /** Edit mode: the product is immutable (only the price changes). */
  lockProduct?: boolean;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: ContractMedicationPriceCreateRequest) => Promise<void> | void;
}

/**
 * Create + edit form for a contract medication-price override (Mo5.2). The medication is picked
 * from the local `products` catalog (medication category) via a search-and-tap list, and the
 * catalog price is surfaced beside the override so the doctor sees what they're discounting from.
 * On edit the product is locked (one override per product; only the price is mutable) — matching
 * the server, which only accepts a price PATCH. Validates against the shared schema.
 */
export function MedicationPriceForm({
  usedProductIds,
  defaultValues,
  lockProduct,
  submitting,
  submitLabel,
  onSubmit,
}: MedicationPriceFormProps) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");

  const form = useForm<ContractMedicationPriceCreateRequest>({
    resolver: zodResolver(ContractMedicationPriceCreateRequestSchema),
    defaultValues: {
      productId: defaultValues?.productId ?? "",
      contractPrice: defaultValues?.contractPrice,
    },
  });
  const selectedProductId = form.watch("productId");

  const { data: products } = useQuery<ProductRow>(`SELECT * FROM products ORDER BY name_ar LIMIT 400`);

  // Medications only (field price overrides are for meds); falls open to all products if the
  // environment hasn't categorised yet — mirrors PrescriptionForm.
  const meds = useMemo(() => {
    const all = products ?? [];
    const m = all.filter((p) => p.category === "medication");
    return m.length > 0 ? m : all;
  }, [products]);

  const used = useMemo(() => new Set(usedProductIds ?? []), [usedProductIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return meds.filter((p) => {
      if (used.has(p.id)) return false;
      if (!q) return true;
      return (
        p.name_ar.toLowerCase().includes(q)
        || (p.name_latin ?? "").toLowerCase().includes(q)
        || (p.barcode ?? "").toLowerCase().includes(q)
      );
    });
  }, [meds, search, used]);

  const selectedProduct = useMemo(
    () => (products ?? []).find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      Alert.alert(t("finance.contracts.medPrices.add"), (err as Error).message ?? "Save failed");
    }
  });

  return (
    <View className="gap-4">
      <Text className="text-ink-700 text-[13px] font-tajawal-bold">
        {t("finance.contracts.medPrices.product")}
      </Text>

      {lockProduct ? (
        <Card flat className="p-3">
          <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
            {selectedProduct?.name_ar ?? "—"}
          </Text>
          {selectedProduct?.selling_price != null ? (
            <Text className="text-ink-500 mt-0.5 text-[12px] font-tajawal">
              {t("finance.contracts.medPrices.catalogPrice")}:{" "}
              {formatCurrency(selectedProduct.selling_price, i18n.resolvedLanguage)}
            </Text>
          ) : null}
        </Card>
      ) : (
        <>
          <Input
            placeholder={t("customers.searchPlaceholder")}
            value={search}
            onChangeText={setSearch}
            leading={<Search size={18} color={colors.ink[400]} />}
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
                      ? { borderColor: colors.teal[600], borderWidth: 1.5 }
                      : undefined
                  }
                >
                  <View className="flex-1 gap-1">
                    <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                      {item.name_ar}
                    </Text>
                    {item.selling_price != null ? (
                      <Pill
                        tone="neutral"
                        label={formatCurrency(item.selling_price, i18n.resolvedLanguage)}
                      />
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            )}
            ListEmptyComponent={
              <Card flat className="p-3">
                <Text className="text-ink-500 text-center text-[13px] font-tajawal">
                  {t("finance.contracts.medPrices.empty")}
                </Text>
              </Card>
            }
          />
        </>
      )}

      <FormField
        control={form.control}
        name="contractPrice"
        label={t("finance.contracts.medPrices.contractPrice")}
        keyboardType="decimal-pad"
        transform={NumberFieldTransform}
      />

      <View className="mt-2">
        <Button label={submitLabel} onPress={handleSubmit} loading={submitting} block />
      </View>
    </View>
  );
}
