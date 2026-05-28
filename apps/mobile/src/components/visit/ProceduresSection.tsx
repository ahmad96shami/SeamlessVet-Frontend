import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { formatCurrency } from "@vet/shared";

import { Add, Forward, Stethoscope } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { useQuery } from "@/sync/hooks";
import type { ProcedureRow } from "@/sync/types";

interface ProceduresSectionProps {
  visitId: string;
  isTerminal: boolean;
}

interface RowWithService extends ProcedureRow {
  service_name: string | null;
}

/**
 * Procedures captured during the visit (PRD §5.2-C; Mo2.3). Reads `procedures` joined to
 * `services` from local SQLite so the row labels show the catalog name without a per-row
 * round-trip. Tapping a row opens the edit sub-route; the "+" CTA opens the create sub-route.
 * Both are gated when the visit is terminal — the locked-visit banner above the section
 * already explains the read-only state.
 */
export function ProceduresSection({ visitId, isTerminal }: ProceduresSectionProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { data: procedures } = useQuery<RowWithService>(
    `SELECT p.*, s.name_ar AS service_name
       FROM procedures p
       LEFT JOIN services s ON s.id = p.service_id
       WHERE p.visit_id = ?
       ORDER BY p.created_at`,
    [visitId],
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
          {t("visits.procedures.title")}
        </Text>
        {!isTerminal ? (
          <Pressable
            onPress={() => router.push({ pathname: "/visits/[id]/procedures/new", params: { id: visitId } })}
            className="bg-navy-900 active:bg-navy-800 flex-row items-center gap-1.5 rounded-pill px-3 py-1.5"
          >
            <Add size={14} color="#FFFFFF" />
            <Text className="text-paper text-[12px] font-tajawal-bold">
              {t("visits.procedures.add")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {(procedures ?? []).length === 0 ? (
        <Card flat className="p-4">
          <Text className="text-ink-500 text-center text-[13px] font-tajawal">
            {t("visits.procedures.empty")}
          </Text>
        </Card>
      ) : (
        (procedures ?? []).map((p) => (
          <Pressable
            key={p.id}
            disabled={isTerminal}
            onPress={() =>
              router.push({
                pathname: "/visits/[id]/procedures/[procId]/edit",
                params: { id: visitId, procId: p.id },
              })
            }
          >
            <Card className="flex-row items-center gap-3 p-3">
              <View className="bg-teal-50 h-10 w-10 items-center justify-center rounded-card">
                <Stethoscope size={18} color="#0F7A8A" />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                  {p.service_name ?? t("visits.procedures.noService")}
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  <Pill tone="teal" label={formatCurrency(p.price, i18n.resolvedLanguage)} />
                  {p.result_text ? (
                    <Pill tone="neutral" label={p.result_text} />
                  ) : null}
                </View>
              </View>
              {!isTerminal ? <Forward size={18} color="#94A1B5" /> : null}
            </Card>
          </Pressable>
        ))
      )}
    </View>
  );
}

/**
 * `useProceduresTotal` lets the visit summary / future Mo4 invoice preview show the running
 * procedure total alongside the exam fee. Centralised here so any caller hits the same
 * watched-query and re-renders together when a row changes.
 */
export function useProceduresTotal(visitId: string): number {
  const { data } = useQuery<{ sum: number }>(
    `SELECT COALESCE(SUM(price), 0) AS sum FROM procedures WHERE visit_id = ?`,
    [visitId],
  );
  return data?.[0]?.sum ?? 0;
}
