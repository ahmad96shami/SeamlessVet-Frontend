import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { formatDate } from "@vet/shared";

import { Edit, Forward, Pill as PillIcon, Stethoscope, Syringe } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { PetRow, PrescriptionRow, VaccinationRow, VisitRow } from "@/sync/types";
import { colors } from "@/theme";

const STATUS_TONE: Record<string, "teal" | "amber" | "green" | "red" | "neutral"> = {
  open: "teal",
  in_progress: "amber",
  completed: "green",
  cancelled: "red",
};

interface VisitWithCounts extends VisitRow {
  procedure_count: number;
  prescription_count: number;
  vaccination_count: number;
}

/**
 * Per-animal detail + medical history timeline (Mo2.6). The header card shows the pet's
 * stats; the timeline below is read from on-device SQLite so the doctor can review past
 * care entirely offline. Three streams feed it: this pet's visits, prescriptions linked
 * to those visits, and vaccinations recorded against this pet (single-pet records — farm-
 * group vaccinations sit on the customer, not a specific animal).
 *
 * Tapping a visit opens its detail page; tapping the edit icon in the top bar opens the
 * pet-edit screen (kept separate so the timeline view stays read-only and uncluttered).
 */
export default function PetDetailScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { id: customerId, petId } = useLocalSearchParams<{ id: string; petId: string }>();

  const { data: pets } = useQuery<PetRow>(`SELECT * FROM pets WHERE id = ?`, [petId ?? ""]);
  const pet = pets?.[0];

  const { data: visits } = useQuery<VisitWithCounts>(
    `SELECT v.*,
            (SELECT COUNT(*) FROM procedures p WHERE p.visit_id = v.id) AS procedure_count,
            (SELECT COUNT(*) FROM prescriptions r WHERE r.visit_id = v.id) AS prescription_count,
            (SELECT COUNT(*) FROM vaccinations vc WHERE vc.visit_id = v.id) AS vaccination_count
       FROM visits v
       WHERE v.pet_id = ?
       ORDER BY COALESCE(v.started_at, v.created_at) DESC
       LIMIT 50`,
    [petId ?? ""],
  );

  const { data: vaccinations } = useQuery<VaccinationRow>(
    `SELECT * FROM vaccinations WHERE pet_id = ? ORDER BY date_given DESC LIMIT 25`,
    [petId ?? ""],
  );

  const { data: prescriptions } = useQuery<PrescriptionRow & { product_name: string | null }>(
    `SELECT p.*, pr.name_ar AS product_name
       FROM prescriptions p
       LEFT JOIN products pr ON pr.id = p.product_id
       JOIN visits v ON v.id = p.visit_id
       WHERE v.pet_id = ?
       ORDER BY p.created_at DESC
       LIMIT 25`,
    [petId ?? ""],
  );

  if (!pet) {
    return (
      <ScreenShell
        header={
          <TopBar title={t("customers.notFound")} onBack={() => router.back()} right={null} />
        }
      >
        <View className="items-center pt-12">
          <Text className="text-ink-500 text-[14px] font-tajawal">{t("customers.notFound")}</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      header={
        <TopBar
          title={pet.name}
          onBack={() => router.back()}
          right={
            <Pressable
              onPress={() => router.push(`/customers/${customerId}/pets/${pet.id}/edit`)}
              accessibilityRole="button"
              className="h-9 w-9 items-center justify-center"
            >
              <Edit size={20} color={colors.navy[900]} />
            </Pressable>
          }
        />
      }
    >
      <Card className="flex-row items-center gap-3 p-4">
        <View className="bg-ink-50 h-14 w-14 items-center justify-center rounded-card">
          <Text className="text-navy-900 text-[18px] font-tajawal-extrabold">
            {pet.name.charAt(0)}
          </Text>
        </View>
        <View className="flex-1 gap-1.5">
          <Text className="text-navy-900 text-[17px] font-tajawal-extrabold" numberOfLines={1}>
            {pet.name}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {pet.species ? <Pill tone="neutral" label={pet.species} /> : null}
            {pet.breed ? <Pill tone="neutral" label={pet.breed} /> : null}
            {pet.sex ? <Pill tone="teal" label={t(`petSex.${pet.sex}`)} /> : null}
            {pet.weight_latest != null ? (
              <Pill tone="neutral" label={`${pet.weight_latest} ${t("customers.pets.kg", { defaultValue: "كغ" })}`} />
            ) : null}
            {pet.date_of_birth ? (
              <Pill
                tone="neutral"
                label={formatDate(pet.date_of_birth, i18n.resolvedLanguage)}
              />
            ) : null}
          </View>
        </View>
      </Card>

      <Section title={t("nav.visits")} empty={(visits ?? []).length === 0 ? t("visits.empty", { defaultValue: "لا توجد زيارات" }) : null}>
        {(visits ?? []).map((v) => (
          <Pressable
            key={v.id}
            onPress={() => router.push({ pathname: "/visits/[id]", params: { id: v.id } })}
          >
            <Card className="flex-row items-center gap-3 p-3">
              <View className="bg-teal-50 h-10 w-10 items-center justify-center rounded-card">
                <Stethoscope size={18} color={colors.teal[600]} />
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
                  {v.procedure_count > 0 ? (
                    <Pill tone="neutral" label={`${v.procedure_count} ${t("visits.procedures.title")}`} />
                  ) : null}
                  {v.prescription_count > 0 ? (
                    <Pill tone="neutral" label={`${v.prescription_count} ${t("visits.prescriptions.title")}`} />
                  ) : null}
                  {v.vaccination_count > 0 ? (
                    <Pill tone="neutral" label={`${v.vaccination_count} ${t("visits.vaccinations.title")}`} />
                  ) : null}
                </View>
              </View>
              <Forward size={18} color={colors.ink[400]} />
            </Card>
          </Pressable>
        ))}
      </Section>

      <Section
        title={t("visits.vaccinations.title")}
        empty={(vaccinations ?? []).length === 0 ? t("visits.vaccinations.empty") : null}
      >
        {(vaccinations ?? []).map((vx) => (
          <Card key={vx.id} className="flex-row items-center gap-3 p-3">
            <View className="bg-teal-50 h-10 w-10 items-center justify-center rounded-card">
              <Syringe size={18} color={colors.teal[600]} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                {vx.vaccine_type}
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                <Pill
                  tone="neutral"
                  label={`${t("visits.vaccinations.col.given")}: ${formatDate(vx.date_given, i18n.resolvedLanguage)}`}
                />
                {vx.next_due_date ? (
                  <Pill
                    tone="amber"
                    label={`${t("visits.vaccinations.col.due")}: ${formatDate(vx.next_due_date, i18n.resolvedLanguage)}`}
                  />
                ) : null}
              </View>
            </View>
          </Card>
        ))}
      </Section>

      <Section
        title={t("visits.prescriptions.title")}
        empty={(prescriptions ?? []).length === 0 ? t("visits.prescriptions.empty") : null}
      >
        {(prescriptions ?? []).map((p) => (
          <Card key={p.id} className="flex-row items-center gap-3 p-3">
            <View className="bg-teal-50 h-10 w-10 items-center justify-center rounded-card">
              <PillIcon size={18} color={colors.teal[600]} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                {p.product_name ?? t("visits.prescriptions.selectProduct")}
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {p.quantity != null ? <Pill tone="teal" label={String(p.quantity)} /> : null}
                {p.dosage ? <Pill tone="neutral" label={p.dosage} /> : null}
                {p.frequency ? <Pill tone="neutral" label={p.frequency} /> : null}
                {p.duration ? <Pill tone="neutral" label={p.duration} /> : null}
              </View>
            </View>
          </Card>
        ))}
      </Section>
    </ScreenShell>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string | null;
  children?: React.ReactNode;
}) {
  return (
    <View className="mt-6 gap-2">
      <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">{title}</Text>
      {empty ? (
        <Card flat className="p-4">
          <Text className="text-ink-500 text-center text-[13px] font-tajawal">{empty}</Text>
        </Card>
      ) : (
        children
      )}
    </View>
  );
}
