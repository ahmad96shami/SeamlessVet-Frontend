import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatCurrency, ProcedureCreateRequestSchema, type ProcedureCreateRequest } from "@vet/shared";

import { Search } from "@/components/icons";
import { Button, Card, Input, Pill } from "@/components/ui";
import { FormField, NumberFieldTransform } from "@/components/forms";
import { useQuery } from "@/sync/hooks";
import type { ServiceRow } from "@/sync/types";

interface ProcedureFormProps {
  visitId: string;
  defaultValues?: { serviceId?: string; price?: number; resultText?: string };
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: ProcedureCreateRequest) => Promise<void> | void;
}

/**
 * Shared create + edit form for a procedure. Service is picked from the local catalog
 * (PowerSync's `services` table) via a search-and-tap list; selecting a row pre-fills the
 * `price` field with the service's `default_price` (the doctor can override per visit).
 *
 * Form contract: shared `ProcedureCreateRequestSchema` — `serviceId` is optional (the
 * backend accepts a procedure with no service-catalog link as long as `resultText` or
 * `resultFileUrl` is present); `price` is non-negative.
 */
export function ProcedureForm({
  visitId,
  defaultValues,
  submitting,
  submitLabel,
  onSubmit,
}: ProcedureFormProps) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");

  const form = useForm<ProcedureCreateRequest>({
    resolver: zodResolver(ProcedureCreateRequestSchema),
    defaultValues: {
      visitId,
      serviceId: defaultValues?.serviceId,
      price: defaultValues?.price,
      resultText: defaultValues?.resultText ?? "",
    },
  });
  const selectedServiceId = form.watch("serviceId");

  const { data: services } = useQuery<ServiceRow>(
    `SELECT * FROM services ORDER BY name_ar LIMIT 200`,
  );

  // Search is applied in JS (catalog is small, watched query stays stable).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services ?? [];
    return (services ?? []).filter((s) =>
      s.name_ar.toLowerCase().includes(q)
      || (s.name_latin ?? "").toLowerCase().includes(q),
    );
  }, [services, search]);

  // When a new service is picked, pre-fill price from its default_price (unless the user
  // has already typed a custom price). Skipped on edit where defaultValues.price is set.
  useEffect(() => {
    if (!selectedServiceId) return;
    const svc = (services ?? []).find((s) => s.id === selectedServiceId);
    if (!svc?.default_price) return;
    const current = form.getValues("price");
    if (current == null) form.setValue("price", svc.default_price);
  }, [selectedServiceId, services, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      Alert.alert(t("visits.procedures.add"), (err as Error).message ?? "Save failed");
    }
  });

  return (
    <View className="gap-4">
      <Text className="text-ink-700 text-[13px] font-tajawal-bold">
        {t("visits.procedures.service")}
      </Text>
      <Input
        placeholder={t("customers.searchPlaceholder")}
        value={search}
        onChangeText={setSearch}
        leading={<Search size={18} color="#94A1B5" />}
        autoCapitalize="none"
      />

      <View className="gap-2">
        <FlatList
          scrollEnabled={false}
          data={filtered.slice(0, 50)}
          keyExtractor={(s) => s.id}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => form.setValue("serviceId", item.id)}>
              <Card
                className="flex-row items-center gap-3 p-3"
                style={selectedServiceId === item.id ? { borderColor: "#0F7A8A", borderWidth: 1.5 } : undefined}
              >
                <View className="flex-1 gap-1">
                  <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                    {item.name_ar}
                  </Text>
                  {item.default_price != null ? (
                    <Pill tone="teal" label={formatCurrency(item.default_price, i18n.resolvedLanguage)} />
                  ) : null}
                </View>
              </Card>
            </Pressable>
          )}
        />
      </View>

      <FormField
        control={form.control}
        name="price"
        label={t("visits.procedures.price")}
        keyboardType="decimal-pad"
        transform={NumberFieldTransform}
      />
      <FormField
        control={form.control}
        name="resultText"
        label={t("visits.procedures.result")}
        placeholder={t("visits.procedures.resultPlaceholder")}
        multiline
      />

      <View className="mt-2">
        <Button label={submitLabel} onPress={handleSubmit} loading={submitting} block />
      </View>
    </View>
  );
}
