import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { buildScheduleFollowUpRequest } from "@vet/shared";

import { Button, Card, Input, Pill } from "@/components/ui";
import { ScreenShell, TopBar } from "@/components/layout";
import { sendOrQueue } from "@/services/sendOrQueue";
import { dialog } from "@/stores/dialogStore";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow, PetRow, VisitRow } from "@/sync/types";

/**
 * Schedule a follow-up appointment from a field visit (Mo9.3 / M17). Goes through the REST
 * queue like the Mo4 billing screens — the doctor books the next visit *at the farm*, often
 * offline. The endpoint creates the appointment server-side (doctor defaults to the origin's,
 * conflict-checked); attending it later waives the checkup fee once per origin (PRD §18.8).
 *
 * No conflict pre-check here, unlike web W12 — appointments aren't in the mobile sync scope
 * (clinic-only table), so the device can't see the doctor's calendar. A genuine clash comes
 * back as `appointment_conflict` (online: alerted inline; queued: parked in the Mo6 review
 * sheet). Date/time are the YYYY-MM-DD + HH:mm text-input pattern (no native picker dep);
 * the composed local time is sent as UTC ISO, exactly like web.
 */
export default function ScheduleFollowUpScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id: visitId } = useLocalSearchParams<{ id: string }>();
  const id = visitId ?? "";

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("09:00");
  const [durationText, setDurationText] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: visits } = useQuery<VisitRow>(`SELECT * FROM visits WHERE id = ?`, [id]);
  const visit = visits?.[0];

  const { data: customers } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [visit?.customer_id ?? ""],
  );
  const customer = customers?.[0];

  const { data: pets } = useQuery<PetRow>(`SELECT * FROM pets WHERE id = ?`, [visit?.pet_id ?? ""]);
  const pet = pets?.[0];

  // Local wall-clock → Date → UTC ISO (mirrors web W12's `new Date(input).toISOString()`).
  const scheduledAt = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) || !/^\d{2}:\d{2}$/.test(time.trim())) return null;
    const composed = new Date(`${date.trim()}T${time.trim()}:00`);
    return Number.isNaN(composed.getTime()) ? null : composed.toISOString();
  }, [date, time]);

  const durationMin = useMemo(() => {
    const trimmed = durationText.trim();
    if (!trimmed) return undefined;
    const value = Number(trimmed);
    return Number.isInteger(value) && value > 0 && value <= 1440 ? value : null;
  }, [durationText]);

  if (!visit) {
    return (
      <ScreenShell
        header={
          <TopBar title={t("visits.scheduleFollowUp.title")} onBack={() => router.back()} right={null} />
        }
      >
        <View className="items-center pt-12">
          <Text className="text-ink-500 text-[14px] font-tajawal">{t("visits.detail.notFound")}</Text>
        </View>
      </ScreenShell>
    );
  }

  const onSubmit = async () => {
    if (!scheduledAt || durationMin === null) return;
    setSubmitting(true);
    try {
      const descriptor = buildScheduleFollowUpRequest(id, {
        scheduledAt,
        durationMin,
        notes: notes.trim() || undefined,
      });
      const result = await sendOrQueue(descriptor);
      void dialog.alert(
        t("visits.scheduleFollowUp.title"),
        result.queued ? t("visits.scheduleFollowUp.queued") : t("visits.scheduleFollowUp.created"),
        t("actions.close"),
      );
      router.back();
    } catch (err) {
      const code = (err as { code?: string }).code;
      const message =
        code === "appointment_conflict"
          ? t("visits.scheduleFollowUp.conflictError")
          : ((err as Error).message ?? "Save failed");
      void dialog.alert(t("visits.scheduleFollowUp.title"), message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell
      header={
        <TopBar title={t("visits.scheduleFollowUp.title")} onBack={() => router.back()} right={null} />
      }
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="gap-4 pb-8">
            <Card className="gap-2 p-4">
              <View className="gap-0.5">
                <Text className="text-ink-500 text-[12px] font-tajawal">
                  {t("visits.create.customer")}
                </Text>
                <Text className="text-navy-900 text-[16px] font-tajawal-extrabold" numberOfLines={1}>
                  {customer?.full_name ?? "—"}
                </Text>
                <Text className="text-ink-500 text-[12px] font-tajawal">
                  {pet?.name ?? t("visits.noPet")}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-1.5 pt-1">
                <Pill tone="teal" label={visit.visit_number ?? t("visits.noNumber")} />
              </View>
              <Text className="text-ink-500 text-[12px] font-tajawal">
                {t("visits.scheduleFollowUp.hint")}
              </Text>
            </Card>

            <Card className="gap-3 p-4">
              <View className="flex-row gap-3">
                <View className="flex-1 gap-1.5">
                  <Text className="text-ink-700 text-[13px] font-tajawal-bold">
                    {t("visits.scheduleFollowUp.date")}
                  </Text>
                  <Input
                    value={date}
                    onChangeText={setDate}
                    placeholder="YYYY-MM-DD"
                    autoCapitalize="none"
                  />
                </View>
                <View className="w-28 gap-1.5">
                  <Text className="text-ink-700 text-[13px] font-tajawal-bold">{"HH:mm"}</Text>
                  <Input
                    value={time}
                    onChangeText={setTime}
                    placeholder="HH:mm"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View className="gap-1.5">
                <Text className="text-ink-700 text-[13px] font-tajawal-bold">
                  {t("visits.scheduleFollowUp.duration")}
                </Text>
                <Input
                  value={durationText}
                  onChangeText={setDurationText}
                  keyboardType="number-pad"
                  placeholder="30"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-ink-700 text-[13px] font-tajawal-bold">
                  {t("visits.scheduleFollowUp.notes")}
                </Text>
                <Input value={notes} onChangeText={setNotes} multiline />
              </View>
            </Card>

            <Button
              label={t("visits.scheduleFollowUp.submit")}
              variant="teal"
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting || !scheduledAt || durationMin === null}
              block
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
