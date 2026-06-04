import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Add, Forward, Pill as PillIcon } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { useQuery } from "@/sync/hooks";
import type { PrescriptionRow } from "@/sync/types";
import { colors } from "@/theme";

interface PrescriptionsSectionProps {
  visitId: string;
  isTerminal: boolean;
}

interface RowWithProduct extends PrescriptionRow {
  product_name: string | null;
  unit_of_measure: string | null;
}

/**
 * Prescriptions captured during a field visit (Mo2.4). Reads `prescriptions` joined to
 * `products` from local SQLite so each row shows the med name without a round-trip.
 *
 * Writing a row here is **clinical-only** — it does not deduct field inventory and does
 * not post to the ledger. The Mo4 server-assembly `POST /visits/{id}/field-invoice` will
 * reassemble the sale (deduct inventory + post the ledger + create the invoice) atomically
 * server-side at issuance, with contract-aware pricing (universal money-server-side rule,
 * SCHEMA invariant #5). Product / quantity / dispense type are immutable after create
 * (server-enforced in PrescriptionsSyncHandler.PatchAsync); the edit screen reflects that.
 */
export function PrescriptionsSection({ visitId, isTerminal }: PrescriptionsSectionProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const { data: rows } = useQuery<RowWithProduct>(
    `SELECT p.*, pr.name_ar AS product_name, pr.unit_of_measure AS unit_of_measure
       FROM prescriptions p
       LEFT JOIN products pr ON pr.id = p.product_id
       WHERE p.visit_id = ?
       ORDER BY p.created_at`,
    [visitId],
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
          {t("visits.prescriptions.title")}
        </Text>
        {!isTerminal ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/visits/[id]/prescriptions/new",
                params: { id: visitId },
              })
            }
            className="bg-navy-900 active:bg-navy-800 flex-row items-center gap-1.5 rounded-pill px-3 py-1.5"
          >
            <Add size={14} color={colors.white} />
            <Text className="text-paper text-[12px] font-tajawal-bold">
              {t("visits.prescriptions.add")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {(rows ?? []).length === 0 ? (
        <Card flat className="p-4">
          <Text className="text-ink-500 text-center text-[13px] font-tajawal">
            {t("visits.prescriptions.empty")}
          </Text>
        </Card>
      ) : (
        (rows ?? []).map((r) => {
          const qty = r.quantity != null ? String(r.quantity) : "—";
          const unit = r.unit_of_measure ? ` ${r.unit_of_measure}` : "";
          return (
            <Pressable
              key={r.id}
              disabled={isTerminal}
              onPress={() =>
                router.push({
                  pathname: "/visits/[id]/prescriptions/[rxId]/edit",
                  params: { id: visitId, rxId: r.id },
                })
              }
            >
              <Card className="flex-row items-center gap-3 p-3">
                <View className="bg-teal-50 h-10 w-10 items-center justify-center rounded-card">
                  <PillIcon size={18} color={colors.teal[600]} />
                </View>
                <View className="flex-1 gap-1">
                  <Text
                    className="text-navy-900 text-[14px] font-tajawal-extrabold"
                    numberOfLines={1}
                  >
                    {r.product_name ?? t("visits.prescriptions.selectProduct")}
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    <Pill tone="teal" label={`${qty}${unit}`} />
                    {r.dosage ? <Pill tone="neutral" label={r.dosage} /> : null}
                    {r.frequency ? <Pill tone="neutral" label={r.frequency} /> : null}
                    {r.duration ? <Pill tone="neutral" label={r.duration} /> : null}
                    {r.reminder_enabled === 1 ? (
                      <Pill tone="amber" label={t("visits.prescriptions.recurring.badge")} />
                    ) : null}
                  </View>
                </View>
                {!isTerminal ? <Forward size={18} color={colors.ink[400]} /> : null}
              </Card>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
