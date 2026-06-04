import { useEffect, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Briefcase, Pill as PillIcon, Search, Warn } from "@/components/icons";
import { Footer, ScreenShell, StepHeader } from "@/components/layout";
import {
  AddButton,
  Button,
  Chip,
  IconTile,
  InfoBanner,
  Input,
  ListRow,
  Money,
  Pill,
  Stepper,
} from "@/components/ui";
import { toArabicDigits } from "@/lib/numerals";
import { useVisitWizardStore } from "@/stores/visitWizardStore";
import {
  classifyStock,
  FIELD_STOCK_SQL,
  type FieldStockRow,
} from "@/sync/fieldInventory";
import { useQuery } from "@/sync/hooks";
import { findActiveContractIdForCustomer } from "@/sync/queries";
import { colors } from "@/theme";

/**
 * Wizard step 2 — dispense meds from the doctor's field stock (MoD.5). Quantities
 * are capped at on-hand (the Mo3.3 guard re-checks at confirm); prices preview
 * contract overrides when the customer has an active contract, but the server
 * remains the pricing authority at issuance (items=[] auto-assembly).
 */
export default function WizardMedsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const customerId = useVisitWizardStore((s) => s.customerId);
  const farmId = useVisitWizardStore((s) => s.farmId);
  const cart = useVisitWizardStore((s) => s.cart);
  const setQty = useVisitWizardStore((s) => s.setQty);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string | null>(null);

  // Active contract detection — drives the banner + the price-override preview.
  useEffect(() => {
    let active = true;
    if (!customerId) {
      setContractId(null);
      return;
    }
    void findActiveContractIdForCustomer(customerId, farmId).then((id) => {
      if (active) setContractId(id);
    });
    return () => {
      active = false;
    };
  }, [customerId, farmId]);

  const { data: stockRows = [] } = useQuery<FieldStockRow>(FIELD_STOCK_SQL);
  const { data: settingsRows = [] } = useQuery<{ expiration_warning_days: number | null }>(
    `SELECT expiration_warning_days FROM system_settings LIMIT 1`,
  );
  const expirationWarningDays = settingsRows[0]?.expiration_warning_days ?? null;

  const { data: overrides = [] } = useQuery<{ product_id: string; contract_price: number | null }>(
    `SELECT product_id, contract_price FROM contract_medication_prices WHERE contract_id = ?`,
    [contractId ?? ""],
  );
  const overrideByProduct = useMemo(
    () => new Map(overrides.map((o) => [o.product_id, o.contract_price])),
    [overrides],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of stockRows) if (r.category) set.add(r.category);
    return [...set].sort();
  }, [stockRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stockRows.filter((r) => {
      if (category && r.category !== category) return false;
      if (!q) return true;
      return (
        (r.name_ar ?? "").toLowerCase().includes(q) ||
        (r.name_latin ?? "").toLowerCase().includes(q)
      );
    });
  }, [stockRows, search, category]);

  const unitPrice = (r: FieldStockRow) =>
    overrideByProduct.get(r.product_id) ?? r.selling_price ?? 0;

  const medsTotal = useMemo(() => {
    let sum = 0;
    for (const r of stockRows) {
      const qty = cart[r.product_id];
      if (qty) sum += qty * (overrideByProduct.get(r.product_id) ?? r.selling_price ?? 0);
    }
    return Math.round(sum * 100) / 100;
  }, [stockRows, cart, overrideByProduct]);

  return (
    <ScreenShell
      staticBody
      header={
        <StepHeader
          title={t("visits.wizard.stepMeds")}
          step={1}
          steps={3}
          onBack={() => router.back()}
        />
      }
      footer={
        <Footer>
          <View className="flex-1">
            <Text className="text-ink-500 text-[12px] font-tajawal">
              {t("visits.wizard.medsTotal")}
            </Text>
            <Money value={medsTotal} className="text-[16px]" />
          </View>
          <Button
            label={t("visits.wizard.continue")}
            onPress={() => router.push("/visits/new/services" as never)}
          />
        </Footer>
      }
    >
      <View className="gap-3">
        {contractId ? (
          <InfoBanner icon={<Briefcase size={18} color={colors.teal[700]} />}>
            {t("visits.wizard.contractActive")}
          </InfoBanner>
        ) : null}

        <Input
          placeholder={t("visits.wizard.searchStock")}
          value={search}
          onChangeText={setSearch}
          leading={<Search size={18} color={colors.ink[400]} />}
          autoCapitalize="none"
        />

        {categories.length > 1 ? (
          <View className="flex-row flex-wrap gap-2">
            {categories.map((c) => (
              <Chip
                key={c}
                label={c}
                active={category === c ? "navy" : "off"}
                onPress={() => setCategory(category === c ? null : c)}
              />
            ))}
          </View>
        ) : null}
      </View>

      <FlatList
        className="mt-3 flex-1"
        data={filtered}
        keyExtractor={(r) => r.id}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <View className="mt-12 items-center">
            <Text className="text-ink-500 text-[14px] font-tajawal">
              {t("visits.wizard.noStock")}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const qty = cart[item.product_id] ?? 0;
          const status = classifyStock(item, { expirationWarningDays });
          const isLow = status === "low";
          const out = status === "out";
          return (
            <ListRow selected={qty > 0}>
              <IconTile tone={out ? "red" : "teal"} badge={isLow ? <Warn size={11} color={colors.amber.DEFAULT} /> : undefined}>
                <PillIcon size={20} color={out ? colors.rose.ink : colors.teal[600]} />
              </IconTile>
              <View className="min-w-0 flex-1">
                <Text className="text-navy-900 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
                  {item.name_ar ?? item.name_latin ?? "—"}
                </Text>
                <View className="mt-0.5 flex-row items-center gap-1">
                  {item.unit_of_measure ? (
                    <Text className="text-ink-500 text-[13px] font-tajawal">
                      {item.unit_of_measure} ·
                    </Text>
                  ) : null}
                  <Money value={unitPrice(item)} dim className="text-[13px]" />
                </View>
                <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                  <Pill
                    compact
                    tone={out ? "red" : "neutral"}
                    label={t("visits.wizard.available", { n: toArabicDigits(item.quantity) })}
                  />
                  {isLow ? (
                    <Pill
                      compact
                      tone="amber"
                      leadingIcon={<Warn size={12} color={colors.amber.ink} />}
                      label={t("inventory.kpi.lowStock")}
                    />
                  ) : null}
                </View>
              </View>
              {qty > 0 ? (
                <Stepper
                  value={qty}
                  onIncrement={() => setQty(item.product_id, Math.min(qty + 1, item.quantity))}
                  onDecrement={() => setQty(item.product_id, qty - 1)}
                  disableIncrement={qty >= item.quantity}
                />
              ) : (
                !out && <AddButton onPress={() => setQty(item.product_id, 1)} />
              )}
            </ListRow>
          );
        }}
      />
    </ScreenShell>
  );
}
