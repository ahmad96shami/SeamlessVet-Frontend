import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PrescriptionCreateRequestSchema,
  type PrescriptionCreateRequest,
} from "@vet/shared";

import { Search } from "@/components/icons";
import { Button, Card, Chip, Input, Pill } from "@/components/ui";
import { FormField, NumberFieldTransform } from "@/components/forms";
import { useQuery } from "@/sync/hooks";
import type { ProductRow } from "@/sync/types";
import { colors } from "@/theme";

interface PrescriptionFormProps {
  visitId: string;
  /** Edit mode: product / quantity / dispense type are immutable post-create (server rule). */
  defaultValues?: {
    productId?: string;
    dispenseType?: "administered_in_clinic" | "dispensed_to_owner";
    quantity?: number;
    dosage?: string;
    frequency?: string;
    duration?: string;
    notes?: string;
    /** M18 recurring-dose reminder schedule (editable post-create, unlike the clinical trio). */
    reminderEnabled?: boolean;
    intervalMinutes?: number | null;
    leadMinutes?: number | null;
    startAt?: string | null;
    endAt?: string | null;
    dosesCount?: number | null;
  };
  /** When true the product/qty fields are locked (edit mode). */
  lockClinical?: boolean;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: PrescriptionCreateRequest) => Promise<void> | void;
}

// ——— M18 reminder schedule (Mo9.5) — mirrors web W12's PrescriptionFormDialog model ———

type IntervalUnit = "minutes" | "hours" | "days";
const UNIT_MIN: Record<IntervalUnit, number> = { minutes: 1, hours: 60, days: 1440 };
const INTERVAL_UNITS: ReadonlyArray<IntervalUnit> = ["minutes", "hours", "days"];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/** Split a stored interval (minutes) back into the largest whole unit for display. */
function splitInterval(minutes: number | null | undefined): { value: string; unit: IntervalUnit } {
  if (!minutes || minutes <= 0) return { value: "", unit: "hours" };
  if (minutes % 1440 === 0) return { value: String(minutes / 1440), unit: "days" };
  if (minutes % 60 === 0) return { value: String(minutes / 60), unit: "hours" };
  return { value: String(minutes), unit: "minutes" };
}

/** An ISO timestamp → local YYYY-MM-DD + HH:mm text-input parts (the mobile date pattern). */
function toLocalParts(iso: string | null | undefined): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Local date+time texts → UTC ISO (mirrors web's `new Date(input).toISOString()`); null = invalid/blank. */
function composeIso(date: string, time: string): string | null {
  if (!DATE_RE.test(date.trim()) || !TIME_RE.test(time.trim())) return null;
  const d = new Date(`${date.trim()}T${time.trim()}:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Shared create + edit form for a prescription on a field visit (Mo2.4).
 *
 * On the field client this is the *clinical record* the doctor gave the owner —
 * `dispense_type` is hard-defaulted to `dispensed_to_owner` (per MOBILE.md Mo2 deliverable;
 * the field doctor doesn't dispense in-clinic). Writing this row through `/sync/prescriptions`
 * does **not** deduct field inventory and does **not** post to the ledger — both happen
 * server-side at Mo4 `POST /visits/{id}/field-invoice` issuance, keeping money + inventory
 * rules server-authoritative (the universal rule, SCHEMA invariant #5).
 *
 * Edit mode locks product / quantity / dispense type — those are immutable post-create on
 * the server (see PrescriptionsSyncHandler.PatchAsync) because they carry the deferred
 * billing meaning the Mo4 invoice will assemble against.
 */
export function PrescriptionForm({
  visitId,
  defaultValues,
  lockClinical,
  submitting,
  submitLabel,
  onSubmit,
}: PrescriptionFormProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  // M18 reminder schedule — plain local state beside RHF (the web W12 dialog does the same):
  // the clinical fields stay schema-validated, the schedule has its own validity rule below.
  const initialInterval = splitInterval(defaultValues?.intervalMinutes);
  const initialStart = toLocalParts(defaultValues?.startAt);
  const initialEnd = toLocalParts(defaultValues?.endAt);
  const [reminderEnabled, setReminderEnabled] = useState(defaultValues?.reminderEnabled ?? false);
  const [intervalValue, setIntervalValue] = useState(initialInterval.value);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(initialInterval.unit);
  const [startDate, setStartDate] = useState(initialStart.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endDate, setEndDate] = useState(initialEnd.date);
  const [endTime, setEndTime] = useState(initialEnd.time);
  const [dosesCount, setDosesCount] = useState(
    defaultValues?.dosesCount != null ? String(defaultValues.dosesCount) : "",
  );
  const [leadMinutes, setLeadMinutes] = useState(
    defaultValues?.leadMinutes != null ? String(defaultValues.leadMinutes) : "",
  );

  const intervalValid = intervalValue.trim() !== "" && Number(intervalValue) > 0;
  const startIso = composeIso(startDate, startTime);
  const endIso = composeIso(endDate, endTime);
  const endBlank = endDate.trim() === "" && endTime.trim() === "";
  // Enabled ⇒ a positive interval + a well-formed start; a non-blank end must parse too.
  const reminderValid = !reminderEnabled || (intervalValid && startIso !== null && (endBlank || endIso !== null));

  /** The M18 portion of the submitted body — `reminderEnabled:false` alone when off (like web). */
  const reminderBody = (): Pick<
    PrescriptionCreateRequest,
    "reminderEnabled" | "intervalMinutes" | "startAt" | "endAt" | "dosesCount" | "leadMinutes"
  > => {
    if (!reminderEnabled) return { reminderEnabled: false };
    return {
      reminderEnabled: true,
      intervalMinutes: Number(intervalValue) * UNIT_MIN[intervalUnit],
      startAt: startIso ?? undefined,
      endAt: endBlank ? undefined : (endIso ?? undefined),
      dosesCount: dosesCount.trim() === "" ? undefined : Number(dosesCount),
      leadMinutes: leadMinutes.trim() === "" ? undefined : Number(leadMinutes),
    };
  };

  const form = useForm<PrescriptionCreateRequest>({
    resolver: zodResolver(PrescriptionCreateRequestSchema),
    defaultValues: {
      visitId,
      productId: defaultValues?.productId ?? "",
      dispenseType: defaultValues?.dispenseType ?? "dispensed_to_owner",
      quantity: defaultValues?.quantity,
      dosage: defaultValues?.dosage ?? "",
      frequency: defaultValues?.frequency ?? "",
      duration: defaultValues?.duration ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });
  const selectedProductId = form.watch("productId");

  // Local catalog from PowerSync. Filter to medications — field prescriptions are only meds;
  // services rendered already live on `procedures`. Falls open to all products if the
  // category column happens to be null for an environment that hasn't categorised yet.
  const { data: products } = useQuery<ProductRow>(
    `SELECT * FROM products ORDER BY name_ar LIMIT 400`,
  );
  const meds = useMemo(() => {
    const all = products ?? [];
    const m = all.filter((p) => p.category === "medication");
    return m.length > 0 ? m : all;
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meds;
    return meds.filter(
      (p) =>
        p.name_ar.toLowerCase().includes(q)
        || (p.name_latin ?? "").toLowerCase().includes(q)
        || (p.barcode ?? "").toLowerCase().includes(q),
    );
  }, [meds, search]);

  const selectedProduct = useMemo(
    () => (products ?? []).find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit({ ...values, ...reminderBody() });
    } catch (err) {
      Alert.alert(t("visits.prescriptions.add"), (err as Error).message ?? "Save failed");
    }
  });

  return (
    <View className="gap-4">
      <Text className="text-ink-700 text-[13px] font-tajawal-bold">
        {t("visits.prescriptions.product")}
      </Text>

      {lockClinical ? (
        <Card flat className="p-3">
          <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
            {selectedProduct?.name_ar ?? t("visits.prescriptions.selectProduct")}
          </Text>
          {selectedProduct?.unit_of_measure ? (
            <Text className="text-ink-500 mt-0.5 text-[12px] font-tajawal">
              {selectedProduct.unit_of_measure}
            </Text>
          ) : null}
        </Card>
      ) : (
        <>
          <Input
            placeholder={t("customers.searchPlaceholder")}
            value={search}
            onChangeText={setSearch}
            leading={<Search size={18} color={colors.ink[400]} />}
            autoCapitalize="none"
          />

          <FlatList
            scrollEnabled={false}
            data={filtered.slice(0, 50)}
            keyExtractor={(p) => p.id}
            ItemSeparatorComponent={() => <View className="h-2" />}
            renderItem={({ item }) => (
              <Pressable onPress={() => form.setValue("productId", item.id)}>
                <Card
                  className="flex-row items-center gap-3 p-3"
                  style={
                    selectedProductId === item.id
                      ? { borderColor: colors.teal[600], borderWidth: 1.5 }
                      : undefined
                  }
                >
                  <View className="flex-1 gap-1">
                    <Text
                      className="text-navy-900 text-[14px] font-tajawal-extrabold"
                      numberOfLines={1}
                    >
                      {item.name_ar}
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {item.unit_of_measure ? (
                        <Pill tone="neutral" label={item.unit_of_measure} />
                      ) : null}
                    </View>
                  </View>
                </Card>
              </Pressable>
            )}
            ListEmptyComponent={
              <Card flat className="p-3">
                <Text className="text-ink-500 text-center text-[13px] font-tajawal">
                  {t("visits.prescriptions.empty")}
                </Text>
              </Card>
            }
          />
        </>
      )}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            control={form.control}
            name="quantity"
            label={t("visits.prescriptions.quantity")}
            keyboardType="decimal-pad"
            transform={NumberFieldTransform}
          />
        </View>
        <View className="flex-1">
          <FormField
            control={form.control}
            name="dosage"
            label={t("visits.prescriptions.dosage")}
          />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            control={form.control}
            name="frequency"
            label={t("visits.prescriptions.frequency")}
          />
        </View>
        <View className="flex-1">
          <FormField
            control={form.control}
            name="duration"
            label={t("visits.prescriptions.duration")}
          />
        </View>
      </View>
      <FormField
        control={form.control}
        name="notes"
        label={t("visits.prescriptions.notes")}
        multiline
      />

      {/* M18 — recurring-dose reminders (Mo9.5). Editable on create AND edit, unlike the
          clinical trio: the schedule is retunable post-create on /sync/prescriptions PATCH. */}
      <Card flat className="gap-3 p-3">
        <View className="flex-row flex-wrap gap-2">
          <Chip
            label={t("visits.prescriptions.recurring.toggle")}
            active={reminderEnabled ? "teal" : "off"}
            onPress={() => setReminderEnabled((v) => !v)}
          />
        </View>

        {reminderEnabled ? (
          <View className="gap-3">
            <Text className="text-ink-500 text-[12px] font-tajawal">
              {t("visits.prescriptions.recurring.hint")}
            </Text>

            <View className="flex-row items-end gap-3">
              <View className="w-20 gap-1.5">
                <Text className="text-ink-700 text-[13px] font-tajawal-bold">
                  {t("visits.prescriptions.recurring.every")}
                </Text>
                <Input
                  value={intervalValue}
                  onChangeText={setIntervalValue}
                  keyboardType="number-pad"
                  placeholder="8"
                />
              </View>
              <View className="flex-1 flex-row flex-wrap gap-2 pb-1">
                {INTERVAL_UNITS.map((u) => (
                  <Chip
                    key={u}
                    label={t(`visits.prescriptions.recurring.unit${u === "minutes" ? "Minutes" : u === "hours" ? "Hours" : "Days"}`)}
                    active={intervalUnit === u ? "teal" : "off"}
                    onPress={() => setIntervalUnit(u)}
                  />
                ))}
              </View>
            </View>

            <View className="gap-1.5">
              <Text className="text-ink-700 text-[13px] font-tajawal-bold">
                {t("visits.prescriptions.recurring.start")}
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    autoCapitalize="none"
                  />
                </View>
                <View className="w-24">
                  <Input
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="HH:mm"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            <View className="gap-1.5">
              <Text className="text-ink-700 text-[13px] font-tajawal-bold">
                {t("visits.prescriptions.recurring.end")}
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                    autoCapitalize="none"
                  />
                </View>
                <View className="w-24">
                  <Input
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="HH:mm"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 gap-1.5">
                <Text className="text-ink-700 text-[13px] font-tajawal-bold">
                  {t("visits.prescriptions.recurring.doses")}
                </Text>
                <Input
                  value={dosesCount}
                  onChangeText={setDosesCount}
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1 gap-1.5">
                <Text className="text-ink-700 text-[13px] font-tajawal-bold">
                  {t("visits.prescriptions.recurring.lead")}
                </Text>
                <Input
                  value={leadMinutes}
                  onChangeText={setLeadMinutes}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <Text className="text-ink-500 text-[12px] font-tajawal">
              {t("visits.prescriptions.recurring.leadHint")}
            </Text>
          </View>
        ) : null}
      </Card>

      <View className="mt-2">
        <Button
          label={submitLabel}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting || !reminderValid}
          block
        />
      </View>
    </View>
  );
}
