import { CARE_TYPE_VALUES, type NightStayResponse } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toDateTimeLocal } from "@/lib/calendar";
import { useCreateNightStay, useUpdateNightStay } from "@/queries/nightStays";
import { useSystemSettings } from "@/queries/systemSettings";

type CareType = (typeof CARE_TYPE_VALUES)[number];

/** Which settings rate seeds the nightly rate for a given care type. */
const RATE_FIELD = {
  medical: "nightStayRateMedical",
  icu: "nightStayRateIcu",
  hotel: "nightStayRateHotel",
} as const;

/**
 * Record / edit a night-stay (M17). Created **open**. The nightly rate defaults from the settings
 * rate for the chosen care type (overridable); on create an omitted check-in defaults to now
 * server-side. M23: billing fields stay editable until the stay is BILLED (a closed-unbilled edit
 * recomputes nights/total server-side); the tab hides this dialog for billed rows.
 */
export function NightStayFormDialog({
  open,
  visitId,
  stay,
  onClose,
}: {
  open: boolean;
  visitId: string;
  stay: NightStayResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateNightStay();
  const update = useUpdateNightStay();
  const settings = useSystemSettings();
  const isEdit = stay !== null;

  const [careType, setCareType] = useState<CareType>("medical");
  const [nightlyRate, setNightlyRate] = useState("");
  const [rateTouched, setRateTouched] = useState(false);
  const [checkInAt, setCheckInAt] = useState("");
  const [exitHour, setExitHour] = useState(""); // "" = unset, else "0".."23"
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setCareType((stay?.careType as CareType) ?? "medical");
    setNightlyRate(stay?.nightlyRate != null ? String(stay.nightlyRate) : "");
    setRateTouched(isEdit); // an existing rate is authoritative — don't auto-overwrite it
    setCheckInAt(stay?.checkInAt ? toDateTimeLocal(new Date(stay.checkInAt)) : "");
    setExitHour(stay?.exitHour != null ? String(stay.exitHour) : "");
    setNotes(stay?.notes ?? "");
  }, [open, stay, isEdit]);

  // Seed the nightly rate from settings for the chosen care type until the user overrides it.
  useEffect(() => {
    if (!open || rateTouched) return;
    const r = settings.data?.[RATE_FIELD[careType]];
    if (r != null) setNightlyRate(String(r));
  }, [open, rateTouched, careType, settings.data]);

  const pending = create.isPending || update.isPending;
  const rateNum = nightlyRate.trim() === "" ? undefined : Number(nightlyRate);

  const onSubmit = () => {
    const body = {
      careType,
      checkInAt: checkInAt ? new Date(checkInAt).toISOString() : undefined,
      nightlyRate: rateNum,
      exitHour: exitHour === "" ? undefined : Number(exitHour),
      notes: notes.trim() || undefined,
    };
    if (isEdit) {
      update.mutate(
        { id: stay.id, body },
        { onSuccess: () => { toast.success(t("admin.common.updated")); onClose(); } },
      );
    } else {
      create.mutate(
        { visitId, ...body },
        { onSuccess: () => { toast.success(t("admin.common.created")); onClose(); } },
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? t("visits.nightStays.editTitle") : t("visits.nightStays.newTitle")}
      className="max-w-lg"
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("visits.nightStays.careType")}>
            <Select value={careType} onChange={(e) => setCareType(e.target.value as CareType)}>
              {CARE_TYPE_VALUES.map((c) => (
                <option key={c} value={c}>
                  {t(`careType.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("visits.nightStays.nightlyRate")} hint={t("visits.nightStays.rateHint")}>
            <Input
              type="number"
              step="0.01"
              min="0"
              dir="ltr"
              value={nightlyRate}
              onChange={(e) => {
                setRateTouched(true);
                setNightlyRate(e.target.value);
              }}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("visits.nightStays.checkIn")}>
            <DatePicker withTime value={checkInAt} onChange={(e) => setCheckInAt(e.target.value)} />
          </Field>
          <Field label={t("visits.nightStays.exitHour")}>
            <Select value={exitHour} onChange={(e) => setExitHour(e.target.value)}>
              <option value="">{t("visits.nightStays.exitHourUnset")}</option>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("visits.nightStays.notes")}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t("admin.common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={pending}>
            {pending ? t("admin.common.saving") : t("admin.common.save")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
