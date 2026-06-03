import {
  DISPENSE_TYPE_VALUES,
  type ApiError,
  type PrescriptionCreateRequest,
  type PrescriptionResponse,
} from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toDateTimeLocal } from "@/lib/calendar";
import { useCreatePrescription, useUpdatePrescription } from "@/queries/prescriptions";
import { useProducts } from "@/queries/products";

type DispenseType = "administered_in_clinic" | "dispensed_to_owner";
type IntervalUnit = "minutes" | "hours" | "days";

const UNIT_MIN: Record<IntervalUnit, number> = { minutes: 1, hours: 60, days: 1440 };

/** Split a stored interval (minutes) back into the largest whole unit for display. */
function splitInterval(minutes: number | null | undefined): { value: string; unit: IntervalUnit } {
  if (minutes == null) return { value: "", unit: "hours" };
  if (minutes % 1440 === 0) return { value: String(minutes / 1440), unit: "days" };
  if (minutes % 60 === 0) return { value: String(minutes / 60), unit: "hours" };
  return { value: String(minutes), unit: "minutes" };
}

/**
 * Add / edit a prescription. On create the product, dispense type, and quantity are chosen — an
 * `administered_in_clinic` script deducts inventory server-side. Product / dispense type / quantity
 * are immutable post-create; the advisory text **and** the M18 recurring-dose reminder schedule are
 * editable on both create and edit.
 */
export function PrescriptionFormDialog({
  open,
  visitId,
  prescription,
  onClose,
}: {
  open: boolean;
  visitId: string;
  prescription: PrescriptionResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreatePrescription();
  const update = useUpdatePrescription();
  const products = useProducts({ take: 200 });
  const meds = useMemo(
    () => (products.data ?? []).filter((p) => p.category === "medication"),
    [products.data],
  );

  const isEdit = prescription !== null;
  const [productId, setProductId] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [dispenseType, setDispenseType] = useState<DispenseType>("administered_in_clinic");
  const [quantity, setQuantity] = useState("");

  // M18 recurring-dose reminder schedule.
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [intervalValue, setIntervalValue] = useState("");
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>("hours");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [dosesCount, setDosesCount] = useState("");
  const [leadMinutes, setLeadMinutes] = useState("");

  useEffect(() => {
    if (!open) return;
    setProductId(prescription?.productId ?? "");
    setDosage(prescription?.dosage ?? "");
    setFrequency(prescription?.frequency ?? "");
    setDuration(prescription?.duration ?? "");
    setNotes(prescription?.notes ?? "");
    setDispenseType((prescription?.dispenseType as DispenseType) ?? "administered_in_clinic");
    setQuantity(prescription?.quantity != null ? String(prescription.quantity) : "");
    setReminderEnabled(prescription?.reminderEnabled ?? false);
    const iv = splitInterval(prescription?.intervalMinutes);
    setIntervalValue(iv.value);
    setIntervalUnit(iv.unit);
    setStartAt(prescription?.startAt ? toDateTimeLocal(new Date(prescription.startAt)) : "");
    setEndAt(prescription?.endAt ? toDateTimeLocal(new Date(prescription.endAt)) : "");
    setDosesCount(prescription?.dosesCount != null ? String(prescription.dosesCount) : "");
    setLeadMinutes(prescription?.leadMinutes != null ? String(prescription.leadMinutes) : "");
  }, [open, prescription]);

  const pending = create.isPending || update.isPending;
  const qtyValid = quantity.trim() !== "" && Number(quantity) > 0;
  const intervalValid = intervalValue.trim() !== "" && Number(intervalValue) > 0;
  const reminderValid = !reminderEnabled || (intervalValid && startAt !== "");
  const valid = (isEdit ? true : productId !== "" && qtyValid) && reminderValid;

  /** The M18 reminder portion of the body (create + patch share it). */
  const reminderBody = (): Pick<
    PrescriptionCreateRequest,
    "reminderEnabled" | "intervalMinutes" | "startAt" | "endAt" | "dosesCount" | "leadMinutes"
  > => {
    if (!reminderEnabled) return { reminderEnabled: false };
    return {
      reminderEnabled: true,
      intervalMinutes: Number(intervalValue) * UNIT_MIN[intervalUnit],
      startAt: startAt ? new Date(startAt).toISOString() : undefined,
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      dosesCount: dosesCount.trim() === "" ? undefined : Number(dosesCount),
      leadMinutes: leadMinutes.trim() === "" ? undefined : Number(leadMinutes),
    };
  };

  const onSubmit = () => {
    if (!valid) return;
    const onError = (e: ApiError) => toast.error(e.message);
    const text = (s: string) => (s.trim() === "" ? undefined : s.trim());
    if (isEdit) {
      update.mutate(
        {
          id: prescription.id,
          body: {
            dosage: text(dosage),
            frequency: text(frequency),
            duration: text(duration),
            notes: text(notes),
            ...reminderBody(),
          },
        },
        { onSuccess: () => { toast.success(t("admin.common.updated")); onClose(); }, onError },
      );
    } else {
      create.mutate(
        {
          visitId,
          productId,
          dosage: text(dosage),
          frequency: text(frequency),
          duration: text(duration),
          notes: text(notes),
          dispenseType,
          quantity: Number(quantity),
          ...reminderBody(),
        },
        { onSuccess: () => { toast.success(t("admin.common.created")); onClose(); }, onError },
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? t("visits.prescriptions.editTitle") : t("visits.prescriptions.newTitle")}
      className="max-w-xl"
    >
      <div className="space-y-4">
        <Field label={t("visits.prescriptions.product")}>
          <Select value={productId} disabled={isEdit} onChange={(e) => setProductId(e.target.value)}>
            <option value="">{t("visits.prescriptions.selectProduct")}</option>
            {meds.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameAr}
                {p.unitOfMeasure ? ` · ${p.unitOfMeasure}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("visits.prescriptions.dispenseType")}>
            <Select
              value={dispenseType}
              disabled={isEdit}
              onChange={(e) => setDispenseType(e.target.value as DispenseType)}
            >
              {DISPENSE_TYPE_VALUES.map((d) => (
                <option key={d} value={d}>
                  {t(`dispenseType.${d}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("visits.prescriptions.quantity")}>
            <Input
              type="number"
              step="0.001"
              min="0"
              dir="ltr"
              disabled={isEdit}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label={t("visits.prescriptions.dosage")}>
            <Input value={dosage} onChange={(e) => setDosage(e.target.value)} />
          </Field>
          <Field label={t("visits.prescriptions.frequency")}>
            <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          </Field>
          <Field label={t("visits.prescriptions.duration")}>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
        </div>
        <Field label={t("visits.prescriptions.notes")}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {/* M18 — recurring-dose reminders */}
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between gap-4">
            <Label>{t("visits.prescriptions.recurring.toggle")}</Label>
            <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
          </div>
          {reminderEnabled ? (
            <>
              <p className="text-xs text-muted-foreground">{t("visits.prescriptions.recurring.hint")}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("visits.prescriptions.recurring.every")}>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      dir="ltr"
                      className="w-24"
                      value={intervalValue}
                      onChange={(e) => setIntervalValue(e.target.value)}
                    />
                    <Select
                      value={intervalUnit}
                      onChange={(e) => setIntervalUnit(e.target.value as IntervalUnit)}
                    >
                      <option value="minutes">{t("visits.prescriptions.recurring.unitMinutes")}</option>
                      <option value="hours">{t("visits.prescriptions.recurring.unitHours")}</option>
                      <option value="days">{t("visits.prescriptions.recurring.unitDays")}</option>
                    </Select>
                  </div>
                </Field>
                <Field label={t("visits.prescriptions.recurring.doses")}>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    dir="ltr"
                    value={dosesCount}
                    onChange={(e) => setDosesCount(e.target.value)}
                  />
                </Field>
                <Field label={t("visits.prescriptions.recurring.start")}>
                  <DatePicker withTime value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </Field>
                <Field label={t("visits.prescriptions.recurring.end")}>
                  <DatePicker withTime value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                </Field>
                <Field
                  label={t("visits.prescriptions.recurring.lead")}
                  hint={t("visits.prescriptions.recurring.leadHint")}
                >
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    dir="ltr"
                    value={leadMinutes}
                    onChange={(e) => setLeadMinutes(e.target.value)}
                  />
                </Field>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t("admin.common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={!valid || pending}>
            {pending ? t("admin.common.saving") : t("admin.common.save")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
