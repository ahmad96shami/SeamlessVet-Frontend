import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Check, Stethoscope } from "@/components/icons";
import { Footer, ScreenShell, StepHeader } from "@/components/layout";
import {
  Button,
  FieldLabel,
  IconTile,
  Input,
  ListRow,
  Money,
} from "@/components/ui";
import { useVisitWizardStore } from "@/stores/visitWizardStore";
import { useQuery } from "@/sync/hooks";
import { getDefaultExamFee } from "@/sync/queries";
import type { ServiceRow } from "@/sync/types";
import { colors } from "@/theme";

/**
 * Wizard step 3 — services, exam fee, notes & an optional next-dose reminder
 * (MoD.5). Selected services become `procedures` rows on confirm; the exam-fee
 * toggle maps to `visits.exam_fee_applied` + the Mo4 exam-fee invoice; the
 * reminder becomes a `vaccinations` row feeding Mo7's local notifications.
 */
export default function WizardServicesScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const services = useVisitWizardStore((s) => s.services);
  const toggleService = useVisitWizardStore((s) => s.toggleService);
  const examFeeEnabled = useVisitWizardStore((s) => s.examFeeEnabled);
  const setExamFeeEnabled = useVisitWizardStore((s) => s.setExamFeeEnabled);
  const examFee = useVisitWizardStore((s) => s.examFee);
  const setExamFee = useVisitWizardStore((s) => s.setExamFee);
  const notes = useVisitWizardStore((s) => s.notes);
  const setNotes = useVisitWizardStore((s) => s.setNotes);
  const nextDose = useVisitWizardStore((s) => s.nextDose);
  const setNextDose = useVisitWizardStore((s) => s.setNextDose);

  const { data: catalog = [] } = useQuery<ServiceRow>(
    `SELECT * FROM services ORDER BY name_ar`,
  );

  // Default exam fee from system_settings — once, without clobbering an edit.
  const [defaultFee, setDefaultFee] = useState<number | null>(null);
  useEffect(() => {
    void getDefaultExamFee().then(setDefaultFee);
  }, []);
  const effectiveExamFee = examFee ?? defaultFee ?? 0;

  const servicesTotal = useMemo(() => {
    let sum = 0;
    for (const s of catalog) if (services[s.id]) sum += s.default_price ?? 0;
    if (examFeeEnabled) sum += effectiveExamFee;
    return Math.round(sum * 100) / 100;
  }, [catalog, services, examFeeEnabled, effectiveExamFee]);

  return (
    <ScreenShell
      staticBody
      header={
        <StepHeader
          title={t("visits.wizard.stepServices")}
          step={2}
          steps={3}
          onBack={() => router.back()}
        />
      }
      footer={
        <Footer>
          <View className="flex-1">
            <Text className="text-ink-500 text-[12px] font-tajawal">
              {t("visits.wizard.servicesTotal")}
            </Text>
            <Money value={servicesTotal} className="text-[16px]" />
          </View>
          <Button
            label={t("visits.wizard.review")}
            onPress={() => router.push("/visits/new/review" as never)}
          />
        </Footer>
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-3 pb-6">
            {/* Exam fee — the design's "كشفية ميدانية" row. */}
            <SelectableRow
              selected={examFeeEnabled}
              onPress={() => setExamFeeEnabled(!examFeeEnabled)}
              title={t("visits.wizard.fieldExamFee")}
              price={effectiveExamFee}
              icon={<Stethoscope size={20} color={colors.teal[600]} />}
            />
            {examFeeEnabled ? (
              <Input
                label={t("invoiceType.exam_fee")}
                keyboardType="decimal-pad"
                value={examFee != null ? String(examFee) : ""}
                placeholder={defaultFee != null ? String(defaultFee) : "0"}
                onChangeText={(v) => {
                  const n = Number(v.trim());
                  setExamFee(v.trim() === "" || !Number.isFinite(n) ? null : n);
                }}
              />
            ) : null}

            {/* Service catalog */}
            {catalog.length === 0 ? (
              <Text className="text-ink-500 mt-4 text-center text-[14px] font-tajawal">
                {t("visits.wizard.noServices")}
              </Text>
            ) : (
              catalog.map((s) => (
                <SelectableRow
                  key={s.id}
                  selected={!!services[s.id]}
                  onPress={() => toggleService(s.id)}
                  title={s.name_ar}
                  price={s.default_price ?? 0}
                  icon={<Stethoscope size={20} color={colors.teal[600]} />}
                />
              ))
            )}

            {/* Notes */}
            <View className="mt-2">
              <Input
                label={t("visits.wizard.notesLabel")}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {/* Optional next-dose reminder */}
            <View className="mt-2">
              <FieldLabel>{t("visits.wizard.nextDoseTitle")}</FieldLabel>
              <View className="gap-3">
                <Input
                  label={t("vaccinations.form.vaccineType")}
                  value={nextDose?.vaccineType ?? ""}
                  onChangeText={(v) =>
                    setNextDose(
                      v.trim() === "" && !(nextDose?.dueDate ?? "")
                        ? null
                        : { vaccineType: v, dueDate: nextDose?.dueDate ?? "" },
                    )
                  }
                />
                <Input
                  label={t("vaccinations.form.nextDueDate")}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                  value={nextDose?.dueDate ?? ""}
                  onChangeText={(v) =>
                    setNextDose(
                      v.trim() === "" && !(nextDose?.vaccineType ?? "")
                        ? null
                        : { vaccineType: nextDose?.vaccineType ?? "", dueDate: v },
                    )
                  }
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

/** The design's selectable service row — radio circle that fills teal with a check. */
function SelectableRow({
  selected,
  onPress,
  title,
  price,
  icon,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: number;
  icon: React.ReactNode;
}) {
  return (
    <ListRow selected={selected} onPress={onPress}>
      <View
        className={`h-7 w-7 items-center justify-center rounded-pill border ${
          selected ? "bg-teal-500 border-teal-500" : "border-ink-200 bg-paper"
        }`}
      >
        {selected ? <Check size={14} color={colors.white} /> : null}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-navy-900 text-[15px] font-tajawal-extrabold" numberOfLines={1}>
          {title}
        </Text>
        <Money value={price} dim className="mt-0.5 text-[13px]" />
      </View>
      <IconTile>{icon}</IconTile>
    </ListRow>
  );
}
