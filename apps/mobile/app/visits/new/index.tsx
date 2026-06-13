import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatDate } from "@vet/shared";

import { Search } from "@/components/icons";
import { Footer, ScreenShell, StepHeader } from "@/components/layout";
import {
  Button,
  Card,
  Chip,
  Input,
  ListRow,
  Photo,
  photoKindForCustomerType,
  Pill,
  SkeletonList,
} from "@/components/ui";
import { useScreenSettled } from "@/hooks/useScreenSettled";
import { formatAmount } from "@/lib/numerals";
import { useVisitWizardStore } from "@/stores/visitWizardStore";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow, FarmRow, PetRow } from "@/sync/types";
import { colors } from "@/theme";

const TYPE_FILTERS = ["poultry_farm", "cattle_farm", "regular_farm", "home"] as const;

interface CustomerWithBalance extends CustomerRow {
  /** Customer's own ledger + all their farm ledgers (M16 polymorphic owners). */
  total_balance: number | null;
}

/** Lean open-batch row for the visit-create batch (Dawra) selector. */
interface BatchPick {
  id: string;
  farm_id: string | null;
  start_date: string;
  end_date: string | null;
}

/**
 * Wizard step 1 — pick the client (MoD.5). Replaces the old single-form
 * `/visits/new`; the `customerId` deep-link from the customer-detail CTA still
 * works (pre-selects and jumps straight to the farm/pet link panel).
 *
 * Tapping a customer with farms/pets shows the link chips (the visit bills the
 * picked farm's ledger — M16); a customer with neither continues immediately.
 */
export default function WizardClientScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { customerId: deepLinkId } = useLocalSearchParams<{ customerId?: string }>();

  const customerId = useVisitWizardStore((s) => s.customerId);
  const farmId = useVisitWizardStore((s) => s.farmId);
  const petId = useVisitWizardStore((s) => s.petId);
  const batchId = useVisitWizardStore((s) => s.batchId);
  const setCustomer = useVisitWizardStore((s) => s.setCustomer);
  const setFarm = useVisitWizardStore((s) => s.setFarm);
  const setPet = useVisitWizardStore((s) => s.setPet);
  const setBatch = useVisitWizardStore((s) => s.setBatch);
  const initBatch = useVisitWizardStore((s) => s.initBatch);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Cheap first frame: skeleton through the push transition, rows right after.
  const settled = useScreenSettled();

  // Deep-link from customer detail: pre-select once on mount.
  useEffect(() => {
    if (deepLinkId) setCustomer(deepLinkId);
  }, [deepLinkId, setCustomer]);

  const { data: customers = [] } = useQuery<CustomerWithBalance>(
    `SELECT c.*, (
        SELECT COALESCE(SUM(l.balance), 0) FROM ledgers l
         WHERE l.customer_id = c.id
            OR l.farm_id IN (SELECT f.id FROM farms f WHERE f.customer_id = c.id)
      ) AS total_balance
       FROM customers c
      ORDER BY c.full_name
      LIMIT 300`,
  );

  const selected = customers.find((c) => c.id === customerId) ?? null;

  const { data: farms = [] } = useQuery<FarmRow>(
    `SELECT * FROM farms WHERE customer_id = ? ORDER BY name`,
    [customerId ?? ""],
  );
  const { data: pets = [] } = useQuery<PetRow>(
    `SELECT * FROM pets WHERE customer_id = ? ORDER BY name`,
    [customerId ?? ""],
  );

  // Mo11 — open supervision batches for this customer/farm, scoped to me by the sync rule
  // (responsible_doctor_id = me). Same selection rule as the old auto-link
  // (findOpenBatchIdForCustomer): with a farm picked, that farm's batches + customer-wide ones;
  // with no farm, every open batch for the customer.
  const { data: batches = [] } = useQuery<BatchPick>(
    `SELECT id, farm_id, start_date, end_date
       FROM batches
      WHERE customer_id = ? AND status = 'open'
        AND (? IS NULL OR farm_id = ? OR farm_id IS NULL)
      ORDER BY (CASE WHEN farm_id = ? THEN 0 ELSE 1 END), COALESCE(updated_at, created_at) DESC`,
    [customerId ?? "", farmId, farmId, farmId],
  );

  // Auto-default to the top open batch the first time we land on a customer/farm context, so a
  // visit under an active Dawra keeps its no-كشفية behaviour without a manual pick. The explicit
  // "no batch" chip opts out; `batchInitialized` (reset on customer/farm change) stops it re-firing.
  useEffect(() => {
    initBatch(batches[0]?.id ?? null);
  }, [batches, initBatch]);

  // M15 — a sole farm pre-selects itself (single-farm customers bill that farm's ledger).
  const soleFarmId = farms.length === 1 ? farms[0]!.id : null;
  const selectedId = selected?.id ?? null;
  useEffect(() => {
    // Intentionally not keyed on farmId: pre-select only while none is chosen.
    if (selectedId && soleFarmId && !useVisitWizardStore.getState().farmId) setFarm(soleFarmId);
  }, [selectedId, soleFarmId, setFarm]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (typeFilter && c.type !== typeFilter) return false;
      if (!q) return true;
      return (
        c.full_name.toLowerCase().includes(q) || (c.phone_primary ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, search, typeFilter]);

  const pick = (c: CustomerWithBalance, hasLinks: boolean) => {
    setCustomer(c.id);
    if (!hasLinks) router.push("/visits/new/meds" as never);
  };

  return (
    <ScreenShell
      staticBody
      header={
        <StepHeader
          title={t("dashboard.actions.newVisit")}
          step={0}
          steps={3}
          onBack={() => router.back()}
        />
      }
      footer={
        selected ? (
          <Footer>
            <Button
              label={t("visits.wizard.continue")}
              onPress={() => router.push("/visits/new/meds" as never)}
              block
              style={{ flex: 1 }}
            />
          </Footer>
        ) : undefined
      }
    >
      {selected ? (
        /* Link panel — the picked client + farm/pet chips. */
        <View className="gap-4">
          <Card className="flex-row items-center gap-3 p-3.5">
            <Photo kind={photoKindForCustomerType(selected.type)} size={56} />
            <View className="min-w-0 flex-1">
              <Text className="text-navy-900 text-[16px] font-tajawal-extrabold" numberOfLines={1}>
                {selected.full_name}
              </Text>
              <Text className="text-ink-500 mt-0.5 text-[13px] font-tajawal">
                {t(`customerType.${selected.type}`, { defaultValue: selected.type })}
              </Text>
            </View>
            <Button
              label={t("vaccinations.form.change")}
              variant="soft"
              size="sm"
              onPress={() => setCustomer(null)}
            />
          </Card>

          {farms.length > 0 ? (
            <View>
              <Text className="text-ink-700 mb-2 text-[13px] font-tajawal-bold">
                {t("visits.create.farm")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  label={t("visits.create.noFarm")}
                  active={farmId === null ? "navy" : "off"}
                  onPress={() => setFarm(null)}
                />
                {farms.map((f) => (
                  <Chip
                    key={f.id}
                    label={f.name}
                    active={farmId === f.id ? "teal" : "off"}
                    onPress={() => setFarm(f.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {batches.length > 0 ? (
            <View>
              <Text className="text-ink-700 mb-2 text-[13px] font-tajawal-bold">
                {t("visits.wizard.batch")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  label={t("visits.wizard.noBatch")}
                  active={batchId === null ? "navy" : "off"}
                  onPress={() => setBatch(null)}
                />
                {batches.map((b) => (
                  <Chip
                    key={b.id}
                    label={
                      b.end_date
                        ? `${formatDate(b.start_date, i18n.resolvedLanguage)} — ${formatDate(b.end_date, i18n.resolvedLanguage)}`
                        : formatDate(b.start_date, i18n.resolvedLanguage)
                    }
                    active={batchId === b.id ? "teal" : "off"}
                    onPress={() => setBatch(b.id)}
                  />
                ))}
              </View>
              {batchId ? (
                <Text className="text-ink-500 mt-1.5 text-[12px] font-tajawal">
                  {t("visits.wizard.batchCoversExam")}
                </Text>
              ) : null}
            </View>
          ) : null}

          {pets.length > 0 ? (
            <View>
              <Text className="text-ink-700 mb-2 text-[13px] font-tajawal-bold">
                {t("visits.create.pet")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  label={t("visits.create.noPet")}
                  active={petId === null ? "navy" : "off"}
                  onPress={() => setPet(null)}
                />
                {pets.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    active={petId === p.id ? "teal" : "off"}
                    onPress={() => setPet(p.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        /* Picker — search, type chips, client rows. */
        <>
          <View className="gap-3">
            <Input
              placeholder={t("visits.create.searchCustomer")}
              value={search}
              onChangeText={setSearch}
              leading={<Search size={18} color={colors.ink[400]} />}
              autoCapitalize="none"
            />
            <View className="flex-row flex-wrap gap-2">
              {TYPE_FILTERS.map((type) => (
                <Chip
                  key={type}
                  label={t(`customerType.${type}`)}
                  active={typeFilter === type ? "navy" : "off"}
                  onPress={() => setTypeFilter(typeFilter === type ? null : type)}
                />
              ))}
            </View>
          </View>

          <FlashList
            // Style object, not className — FlashList isn't css-interop registered.
            style={{ marginTop: 12, flex: 1 }}
            data={settled ? filtered : []}
            keyExtractor={(c) => c.id}
            ItemSeparatorComponent={() => <View className="h-3" />}
            ListEmptyComponent={
              !settled ? (
                <SkeletonList />
              ) : (
                <View className="mt-12 items-center">
                  <Text className="text-ink-500 text-[14px] font-tajawal">
                    {t("customers.empty")}
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => {
              const owes = (item.total_balance ?? 0) > 0;
              return (
                <ListRow onPress={() => pick(item, true)}>
                  <Photo kind={photoKindForCustomerType(item.type)} size={56} />
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-navy-900 text-[15px] font-tajawal-extrabold"
                      numberOfLines={1}
                    >
                      {item.full_name}
                    </Text>
                    <Text className="text-ink-500 mt-0.5 text-[13px] font-tajawal" numberOfLines={1}>
                      {t(`customerType.${item.type}`, { defaultValue: item.type })}
                      {item.phone_primary ? ` · ${item.phone_primary}` : ""}
                    </Text>
                    {owes ? (
                      <View className="mt-1.5 flex-row">
                        <Pill
                          tone="red"
                          compact
                          label={t("visits.wizard.debt", {
                            amount: formatAmount(item.total_balance ?? 0),
                          })}
                        />
                      </View>
                    ) : null}
                  </View>
                </ListRow>
              );
            }}
          />
        </>
      )}
    </ScreenShell>
  );
}
