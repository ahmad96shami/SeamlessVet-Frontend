import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@vet/shared";

import { Add, Edit, Pill as PillIcon, Trash } from "@/components/icons";
import { Card, Money } from "@/components/ui";
import { useQuery } from "@/sync/hooks";
import { syncDelete } from "@/sync/writes";
import type { ContractMedicationPriceRow } from "@/sync/types";

interface Props {
  contractId: string;
  /** Overrides are editable only while the parent contract is a draft (server rejects otherwise). */
  isDraft: boolean;
}

interface RowWithProduct extends ContractMedicationPriceRow {
  product_name: string | null;
  catalog_price: number | null;
}

/**
 * Per-medication price overrides on a contract (Mo5.2). Reads `contract_medication_prices` joined
 * to `products` from local SQLite — the contract price replaces the catalog price for that
 * medication once the contract is active (PRD §6.6). Add/edit/delete are gated to drafts; a
 * non-draft contract shows the list read-only with the draft-only notice.
 */
export function ContractMedicationPricesSection({ contractId, isDraft }: Props) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;

  const { data } = useQuery<RowWithProduct>(
    `SELECT cmp.*, p.name_ar AS product_name, p.selling_price AS catalog_price
       FROM contract_medication_prices cmp
       LEFT JOIN products p ON p.id = cmp.product_id
       WHERE cmp.contract_id = ?
       ORDER BY p.name_ar`,
    [contractId],
  );
  const rows = data ?? [];

  const confirmDelete = (row: RowWithProduct) => {
    Alert.alert(t("finance.contracts.medPrices.title"), t("finance.contracts.medPrices.deleteConfirm"), [
      { text: t("actions.cancel"), style: "cancel" },
      {
        text: t("actions.delete"),
        style: "destructive",
        onPress: () => {
          void syncDelete("contract_medication_prices", row.id);
        },
      },
    ]);
  };

  return (
    <View className="mt-4 gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
          {t("finance.contracts.medPrices.title")}
        </Text>
        {isDraft ? (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/contracts/[id]/med-prices/new", params: { id: contractId } })
            }
            className="bg-navy-900 active:bg-navy-800 flex-row items-center gap-1.5 rounded-pill px-3 py-1.5"
          >
            <Add size={14} color="#FFFFFF" />
            <Text className="text-paper text-[12px] font-tajawal-bold">
              {t("finance.contracts.medPrices.add")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Text className="text-ink-500 text-[12px] font-tajawal">
        {isDraft
          ? t("finance.contracts.medPrices.subtitle")
          : t("finance.contracts.medPrices.draftOnly")}
      </Text>

      {rows.length === 0 ? (
        <Card flat className="p-4">
          <Text className="text-ink-500 text-center text-[13px] font-tajawal">
            {t("finance.contracts.medPrices.empty")}
          </Text>
        </Card>
      ) : (
        rows.map((row) => (
          <Card key={row.id} className="flex-row items-center gap-3 p-3">
            <View className="bg-teal-50 h-10 w-10 items-center justify-center rounded-card">
              <PillIcon size={18} color="#0F7A8A" />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                {row.product_name ?? "—"}
              </Text>
              <View className="flex-row flex-wrap items-center gap-2">
                <Money value={row.contract_price} className="text-[13px]" />
                {row.catalog_price != null ? (
                  <Text className="text-ink-500 text-[12px] font-tajawal line-through">
                    {formatCurrency(row.catalog_price, lang)}
                  </Text>
                ) : null}
              </View>
            </View>
            {isDraft ? (
              <View className="flex-row items-center gap-1">
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/contracts/[id]/med-prices/[priceId]/edit",
                      params: { id: contractId, priceId: row.id },
                    })
                  }
                  accessibilityRole="button"
                  className="h-9 w-9 items-center justify-center"
                >
                  <Edit size={18} color="#223D69" />
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(row)}
                  accessibilityRole="button"
                  className="h-9 w-9 items-center justify-center"
                >
                  <Trash size={18} color="#B33235" />
                </Pressable>
              </View>
            ) : null}
          </Card>
        ))
      )}
    </View>
  );
}
