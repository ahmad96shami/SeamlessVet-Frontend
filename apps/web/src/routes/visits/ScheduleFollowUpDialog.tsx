import { formatDate, type ApiError, type VisitResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { addDays, appointmentEnd, startOfDay, windowsOverlap } from "@/lib/calendar";
import { useAppointments } from "@/queries/appointments";
import { useScheduleFollowUp } from "@/queries/visits";

const DURATIONS = [15, 30, 45, 60, 90];
const OCCUPYING = new Set(["scheduled", "confirmed", "attended"]);

/**
 * Schedule a follow-up appointment from a visit (M17). Customer + pet come from the origin visit
 * server-side; here we pick the doctor (defaulting to the origin's), the slot, duration and notes. A
 * client-side overlap pre-check warns on a taken slot; the server is authoritative — a true clash
 * returns 409 `appointment_conflict`, surfaced inline. Attending the resulting appointment later
 * waives the checkup fee once for this origin visit.
 */
export function ScheduleFollowUpDialog({
  open,
  visit,
  onClose,
}: {
  open: boolean;
  visit: VisitResponse;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const doctors = useDoctorOptions();
  const schedule = useScheduleFollowUp();

  const [doctorId, setDoctorId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [notes, setNotes] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDoctorId(visit.doctorId);
    setScheduledAt("");
    setDurationMin(30);
    setNotes("");
    setServerError(null);
  }, [open, visit.doctorId]);

  // Drop a stale "not saved" conflict once the user adjusts the slot/doctor/duration.
  useEffect(() => {
    setServerError(null);
  }, [scheduledAt, doctorId, durationMin]);

  const start = scheduledAt ? new Date(scheduledAt) : null;
  const dayAnchor = start && !Number.isNaN(start.getTime()) ? start : new Date();
  const dayAppts = useAppointments({
    doctorId: doctorId || undefined,
    from: startOfDay(dayAnchor).toISOString(),
    to: new Date(addDays(startOfDay(dayAnchor), 1).getTime() - 1).toISOString(),
    take: 200,
  });

  const conflict = useMemo(() => {
    const s = scheduledAt ? new Date(scheduledAt) : null;
    if (!s || Number.isNaN(s.getTime()) || !doctorId) return null;
    const e = appointmentEnd(s, durationMin);
    return (
      (dayAppts.data ?? []).find(
        (a) =>
          a.doctorId === doctorId &&
          OCCUPYING.has(a.status) &&
          windowsOverlap(s, e, new Date(a.scheduledAt), appointmentEnd(new Date(a.scheduledAt), a.durationMin)),
      ) ?? null
    );
  }, [dayAppts.data, scheduledAt, durationMin, doctorId]);

  const canSubmit = !!doctorId && !!scheduledAt && !schedule.isPending;

  const onSubmit = () => {
    if (!doctorId || !scheduledAt) return;
    setServerError(null);
    schedule.mutate(
      {
        visitId: visit.id,
        body: {
          scheduledAt: new Date(scheduledAt).toISOString(),
          doctorId,
          durationMin,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success(t("visits.scheduleFollowUp.created"));
          onClose();
        },
        onError: (e: ApiError) => {
          setServerError(
            e.code === "appointment_conflict" ? t("visits.scheduleFollowUp.conflictError") : e.message,
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("visits.scheduleFollowUp.title")} className="max-w-lg">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("visits.scheduleFollowUp.hint")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("visits.scheduleFollowUp.doctor")}>
            <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">{t("appointments.selectDoctor")}</option>
              {doctors.options.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("visits.scheduleFollowUp.duration")}>
            <Select value={String(durationMin)} onChange={(e) => setDurationMin(Number(e.target.value))}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {t("appointments.minutesCount", { count: d })}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("visits.scheduleFollowUp.date")}>
              <DatePicker withTime value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t("visits.scheduleFollowUp.notes")}>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>

          {conflict ? (
            <div
              className="rounded-lg p-2.5 text-xs sm:col-span-2"
              style={{
                background: "var(--amber-soft)",
                color: "#8b6500",
                border: "1px solid rgba(244,180,0,0.45)",
              }}
            >
              {t("visits.scheduleFollowUp.conflictWarning", {
                time: formatDate(new Date(conflict.scheduledAt), lang, "h:mm a"),
              })}
            </div>
          ) : null}
          {serverError ? (
            <div
              className="rounded-lg p-2.5 text-xs sm:col-span-2"
              style={{ background: "var(--red-soft)", color: "var(--red)", border: "1px solid var(--red)" }}
            >
              {serverError}
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={schedule.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {schedule.isPending ? t("admin.common.saving") : t("visits.scheduleFollowUp.submit")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
