import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { formatDate } from "@vet/shared";

import { Add, Forward, Syringe } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { useQuery } from "@/sync/hooks";
import type { VaccinationRow } from "@/sync/types";
import { colors } from "@/theme";

interface VaccinationsSectionProps {
  visitId: string;
  isTerminal: boolean;
}

interface RowWithPet extends VaccinationRow {
  pet_name: string | null;
}

/**
 * Vaccinations captured during a field visit (Mo2.5). Reads `vaccinations` joined to
 * `pets` from local SQLite so the row label shows the pet name without a round-trip; rows
 * with a null `pet_id` are farm-group vaccinations (one record covers the whole herd) and
 * render the "farm group" badge.
 *
 * `next_due_date` feeds the M11 vaccination-reminder job server-side; on the device it
 * surfaces as a Pill so the doctor can eyeball upcoming doses inline.
 */
export function VaccinationsSection({ visitId, isTerminal }: VaccinationsSectionProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const { data: rows } = useQuery<RowWithPet>(
    `SELECT v.*, pe.name AS pet_name
       FROM vaccinations v
       LEFT JOIN pets pe ON pe.id = v.pet_id
       WHERE v.visit_id = ?
       ORDER BY v.created_at`,
    [visitId],
  );

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
          {t("visits.vaccinations.title")}
        </Text>
        {!isTerminal ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/visits/[id]/vaccinations/new",
                params: { id: visitId },
              })
            }
            className="bg-navy-900 active:bg-navy-800 flex-row items-center gap-1.5 rounded-pill px-3 py-1.5"
          >
            <Add size={14} color={colors.white} />
            <Text className="text-paper text-[12px] font-tajawal-bold">
              {t("visits.vaccinations.add")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {(rows ?? []).length === 0 ? (
        <Card flat className="p-4">
          <Text className="text-ink-500 text-center text-[13px] font-tajawal">
            {t("visits.vaccinations.empty")}
          </Text>
        </Card>
      ) : (
        (rows ?? []).map((r) => (
          <Pressable
            key={r.id}
            disabled={isTerminal}
            onPress={() =>
              router.push({
                pathname: "/visits/[id]/vaccinations/[vaxId]/edit",
                params: { id: visitId, vaxId: r.id },
              })
            }
          >
            <Card className="flex-row items-center gap-3 p-3">
              <View className="bg-teal-50 h-10 w-10 items-center justify-center rounded-card">
                <Syringe size={18} color={colors.teal[600]} />
              </View>
              <View className="flex-1 gap-1">
                <Text
                  className="text-navy-900 text-[14px] font-tajawal-extrabold"
                  numberOfLines={1}
                >
                  {r.vaccine_type}
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  <Pill
                    tone="neutral"
                    label={`${t("visits.vaccinations.col.given")}: ${formatDate(r.date_given, i18n.resolvedLanguage)}`}
                  />
                  {r.next_due_date ? (
                    <Pill
                      tone="amber"
                      label={`${t("visits.vaccinations.col.due")}: ${formatDate(r.next_due_date, i18n.resolvedLanguage)}`}
                    />
                  ) : null}
                  <Pill
                    tone={r.pet_id ? "teal" : "amber"}
                    label={
                      r.pet_name
                      ?? t("visits.vaccinations.farmGroup", { defaultValue: "مجموعة (المزرعة)" })
                    }
                  />
                </View>
              </View>
              {!isTerminal ? <Forward size={18} color={colors.ink[400]} /> : null}
            </Card>
          </Pressable>
        ))
      )}
    </View>
  );
}
