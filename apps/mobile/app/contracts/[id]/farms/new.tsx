import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { Add, Cow } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { ContractRow, FarmRow } from "@/sync/types";
import { syncInsert } from "@/sync/writes";

/**
 * Attach a farm to a draft contract (Mo8.3). Lists the contract customer's farms that aren't
 * covered yet (dedup, the W11 precedent) — tapping one inserts the `contract_farms` join row
 * via `/sync` (offline-capable) and returns to the contract detail.
 */
export default function AttachContractFarmScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: contractId } = useLocalSearchParams<{ id: string }>();
  const [attaching, setAttaching] = useState<string | null>(null);

  const { data: contracts } = useQuery<ContractRow>(
    `SELECT * FROM contracts WHERE id = ?`,
    [contractId ?? ""],
  );
  const contract = contracts?.[0];

  // The customer's farms not already covered by this contract.
  const { data: farms } = useQuery<FarmRow>(
    `SELECT f.* FROM farms f
       WHERE f.customer_id = ?
         AND f.id NOT IN (SELECT farm_id FROM contract_farms WHERE contract_id = ?)
       ORDER BY f.name`,
    [contract?.customer_id ?? "", contractId ?? ""],
  );
  const available = farms ?? [];

  const attach = async (farm: FarmRow) => {
    if (!contractId || attaching) return;
    setAttaching(farm.id);
    try {
      await syncInsert("contract_farms", {
        contract_id: contractId,
        farm_id: farm.id,
      });
      router.back();
    } finally {
      setAttaching(null);
    }
  };

  return (
    <ScreenShell
      header={
        <TopBar title={t("finance.contractFarms.pickFarm")} onBack={() => router.back()} right={null} />
      }
    >
      <View className="gap-2">
        {available.length === 0 ? (
          <Card flat className="p-4">
            <Text className="text-ink-500 text-center text-[13px] font-tajawal">
              {t("finance.contractFarms.noFarmsForCustomer")}
            </Text>
          </Card>
        ) : (
          available.map((farm) => (
            <Pressable key={farm.id} onPress={() => void attach(farm)} disabled={attaching != null}>
              <Card className="flex-row items-center gap-3 p-3">
                <View className="bg-teal-50 h-10 w-10 items-center justify-center rounded-card">
                  <Cow size={18} color="#0F7A8A" />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                    {farm.name}
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    <Pill tone="teal" label={t(`farmKind.${farm.kind}`)} />
                    {farm.head_count != null ? (
                      <Pill tone="neutral" label={`${t("customers.farms.headCount")}: ${farm.head_count}`} />
                    ) : null}
                  </View>
                </View>
                <Add size={18} color="#223D69" />
              </Card>
            </Pressable>
          ))
        )}
      </View>
    </ScreenShell>
  );
}
