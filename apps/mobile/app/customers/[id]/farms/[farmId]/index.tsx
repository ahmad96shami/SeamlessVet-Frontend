import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, Text, View } from "react-native";
import { formatDate } from "@vet/shared";

import { Bird, Box, Briefcase, Cow, Edit, Forward, Paper, Stethoscope, Trash } from "@/components/icons";
import { Button, Card, Money, Pill } from "@/components/ui";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow, FarmRow, LedgerRow, VisitRow } from "@/sync/types";
import { syncDelete } from "@/sync/writes";

const KIND_ICON: Record<string, React.ReactNode> = {
  poultry: <Bird size={22} color="#0F7A8A" />,
  cattle: <Cow size={22} color="#0F7A8A" />,
  mixed: <Briefcase size={22} color="#0F7A8A" />,
  other: <Box size={22} color="#0F7A8A" />,
};

const STATUS_TONE: Record<string, "teal" | "amber" | "green" | "red" | "neutral"> = {
  open: "teal",
  in_progress: "amber",
  completed: "green",
  cancelled: "red",
};

/**
 * Farm detail (Mo8.2). Mirrors the pet detail: an info header + the visits recorded at this
 * farm, all from on-device SQLite. The per-farm balance card + statement entry mount here in
 * Mo8.4 once the farm ledger read lands. Edit opens the farm form; delete soft-deletes via
 * `/sync/farms` (offline-capable) after a confirm.
 */
export default function FarmDetailScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { id: customerId, farmId } = useLocalSearchParams<{ id: string; farmId: string }>();

  const { data: farms } = useQuery<FarmRow>(`SELECT * FROM farms WHERE id = ?`, [farmId ?? ""]);
  const farm = farms?.[0];

  const { data: owners } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [farm?.customer_id ?? ""],
  );
  const owner = owners?.[0];

  const { data: visits } = useQuery<VisitRow>(
    `SELECT * FROM visits WHERE farm_id = ? ORDER BY COALESCE(started_at, created_at) DESC LIMIT 25`,
    [farmId ?? ""],
  );

  // Mo8.4 — the farm's own ledger (M16 polymorphic owner), streamed via the my_farms sync rule.
  const { data: ledgers } = useQuery<LedgerRow>(
    `SELECT * FROM ledgers WHERE farm_id = ?`,
    [farmId ?? ""],
  );
  const ledger = ledgers?.[0];

  if (!farm) {
    return (
      <ScreenShell
        header={
          <TopBar title={t("customers.farmDetail.notFound")} onBack={() => router.back()} right={null} />
        }
      >
        <View className="items-center pt-12">
          <Text className="text-ink-500 text-[14px] font-tajawal">
            {t("customers.farmDetail.notFound")}
          </Text>
        </View>
      </ScreenShell>
    );
  }

  const confirmDelete = () => {
    Alert.alert(
      t("customers.farms.title"),
      t("customers.farms.deleteConfirm", { name: farm.name }),
      [
        { text: t("actions.cancel"), style: "cancel" },
        {
          text: t("actions.delete"),
          style: "destructive",
          onPress: () => {
            void syncDelete("farms", farm.id).then(() => router.back());
          },
        },
      ],
    );
  };

  return (
    <ScreenShell
      header={
        <TopBar
          title={farm.name}
          onBack={() => router.back()}
          right={
            <View className="flex-row items-center">
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/customers/[id]/farms/[farmId]/edit",
                    params: { id: customerId ?? farm.customer_id, farmId: farm.id },
                  })
                }
                accessibilityRole="button"
                className="h-9 w-9 items-center justify-center"
              >
                <Edit size={20} color="#223D69" />
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                accessibilityRole="button"
                className="h-9 w-9 items-center justify-center"
              >
                <Trash size={20} color="#B33235" />
              </Pressable>
            </View>
          }
        />
      }
    >
      <Card className="flex-row items-center gap-3 p-4">
        <View className="bg-teal-50 h-14 w-14 items-center justify-center rounded-card">
          {KIND_ICON[farm.kind] ?? <Box size={22} color="#0F7A8A" />}
        </View>
        <View className="flex-1 gap-1.5">
          <Text className="text-navy-900 text-[17px] font-tajawal-extrabold" numberOfLines={1}>
            {farm.name}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            <Pill tone="teal" label={t(`farmKind.${farm.kind}`)} />
            {farm.animal_type ? <Pill tone="neutral" label={farm.animal_type} /> : null}
            {farm.head_count != null ? (
              <Pill tone="neutral" label={`${t("customers.farms.headCount")}: ${farm.head_count}`} />
            ) : null}
          </View>
        </View>
      </Card>

      {ledger ? (
        <Card flat className="mt-3 flex-row items-center justify-between p-3">
          <View className="gap-0.5">
            <Text className="text-ink-500 text-[12px] font-tajawal">
              {t("customers.farmDetail.balance")} · {t(`ledgerStatus.${ledger.status}`)}
            </Text>
            <Money value={ledger.balance} />
          </View>
        </Card>
      ) : null}

      <Card flat className="mt-3 gap-3 p-4">
        <InfoRow label={t("customers.farmDetail.owner")} value={owner?.full_name ?? "—"} />
        <InfoRow label={t("customers.farms.location")} value={farm.location ?? "—"} />
        {farm.notes ? <InfoRow label={t("customers.farms.notes")} value={farm.notes} /> : null}
      </Card>

      <View className="mt-4">
        <Button
          label={t("customers.farms.account")}
          variant="ghost"
          block
          leadingIcon={<Paper size={18} color="#223D69" />}
          onPress={() =>
            router.push({
              pathname: "/customers/[id]/farms/[farmId]/statement",
              params: { id: customerId ?? farm.customer_id, farmId: farm.id },
            })
          }
        />
      </View>

      <View className="mt-6 gap-2">
        <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">{t("nav.visits")}</Text>
        {(visits ?? []).length === 0 ? (
          <Card flat className="p-4">
            <Text className="text-ink-500 text-center text-[13px] font-tajawal">
              {t("visits.empty", { defaultValue: "لا توجد زيارات" })}
            </Text>
          </Card>
        ) : (
          (visits ?? []).map((v) => (
            <Pressable
              key={v.id}
              onPress={() => router.push({ pathname: "/visits/[id]", params: { id: v.id } })}
            >
              <Card className="flex-row items-center gap-3 p-3">
                <View className="bg-teal-50 h-10 w-10 items-center justify-center rounded-card">
                  <Stethoscope size={18} color="#0F7A8A" />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                    {v.visit_number ?? t("visits.noNumber")}
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    <Pill tone={STATUS_TONE[v.status] ?? "neutral"} label={t(`visitStatus.${v.status}`)} />
                    {v.started_at ? (
                      <Pill tone="neutral" label={formatDate(v.started_at, i18n.resolvedLanguage)} />
                    ) : null}
                  </View>
                </View>
                <Forward size={18} color="#94A1B5" />
              </Card>
            </Pressable>
          ))
        )}
      </View>
    </ScreenShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-ink-500 text-[13px] font-tajawal">{label}</Text>
      <Text className="text-navy-900 flex-1 text-end text-[14px] font-tajawal-bold" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
