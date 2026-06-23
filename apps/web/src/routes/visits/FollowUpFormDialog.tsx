import { type DailyFollowUpResponse } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateDailyFollowUp, useUpdateDailyFollowUp } from "@/queries/dailyFollowUps";

const todayISO = () => new Date().toISOString().slice(0, 10);
const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
const text = (s: string) => (s.trim() === "" ? undefined : s.trim());

/** Add / edit a daily follow-up entry (clinic hospitalization tracking, PRD §5.2-E). */
export function FollowUpFormDialog({
  open,
  visitId,
  followUp,
  onClose,
}: {
  open: boolean;
  visitId: string;
  followUp: DailyFollowUpResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateDailyFollowUp();
  const update = useUpdateDailyFollowUp();

  const [entryDate, setEntryDate] = useState(todayISO());
  const [condition, setCondition] = useState("");
  const [temperature, setTemperature] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [administeredMeds, setAdministeredMeds] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setEntryDate(followUp?.entryDate ?? todayISO());
    setCondition(followUp?.condition ?? "");
    setTemperature(followUp?.temperature != null ? String(followUp.temperature) : "");
    setHeartRate(followUp?.heartRate != null ? String(followUp.heartRate) : "");
    setRespiratoryRate(followUp?.respiratoryRate != null ? String(followUp.respiratoryRate) : "");
    setAdministeredMeds(followUp?.administeredMeds ?? "");
    setNotes(followUp?.notes ?? "");
  }, [open, followUp]);

  const pending = create.isPending || update.isPending;
  const valid = entryDate.trim() !== "";

  const onSubmit = () => {
    if (!valid) return;
    const fields = {
      condition: text(condition),
      temperature: num(temperature),
      heartRate: num(heartRate),
      respiratoryRate: num(respiratoryRate),
      administeredMeds: text(administeredMeds),
      notes: text(notes),
    };
    if (followUp) {
      update.mutate(
        { id: followUp.id, body: { entryDate, ...fields } },
        { onSuccess: () => { toast.success(t("admin.common.updated")); onClose(); } },
      );
    } else {
      create.mutate(
        { visitId, entryDate, ...fields },
        { onSuccess: () => { toast.success(t("admin.common.created")); onClose(); } },
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={followUp ? t("visits.followups.editTitle") : t("visits.followups.newTitle")}
      className="max-w-xl"
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("visits.followups.entryDate")}>
            <DatePicker value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </Field>
          <Field label={t("visits.followups.condition")}>
            <Input value={condition} onChange={(e) => setCondition(e.target.value)} />
          </Field>
          <Field label={t("visits.assessment.temperature")}>
            <Input type="number" step="0.1" min="0" dir="ltr" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
          </Field>
          <Field label={t("visits.assessment.heartRate")}>
            <Input type="number" step="1" min="0" dir="ltr" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} />
          </Field>
          <Field label={t("visits.assessment.respiratoryRate")}>
            <Input type="number" step="1" min="0" dir="ltr" value={respiratoryRate} onChange={(e) => setRespiratoryRate(e.target.value)} />
          </Field>
          <Field label={t("visits.followups.administeredMeds")}>
            <Input value={administeredMeds} onChange={(e) => setAdministeredMeds(e.target.value)} />
          </Field>
        </div>
        <Field label={t("visits.followups.notes")}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
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
