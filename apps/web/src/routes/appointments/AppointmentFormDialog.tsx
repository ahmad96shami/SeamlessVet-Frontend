import {
  formatDate,
  getAppointment,
  type ApiError,
  type AppointmentResponse,
  type CustomerResponse,
} from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  addDays,
  appointmentEnd,
  startOfDay,
  toDateTimeLocal,
  windowsOverlap,
} from "@/lib/calendar";
import {
  useAppointments,
  useAttendAppointment,
  useCancelAppointment,
  useCreateAppointment,
  useNoShowAppointment,
  useUpdateAppointment,
} from "@/queries/appointments";
import { useCustomer, useCustomers } from "@/queries/customers";
import { usePets } from "@/queries/pets";
import { useServices } from "@/queries/services";
import { appointmentStatusVariant } from "@/routes/appointments/appointmentStatus";
import { apiClient } from "@/services/apiClient";

type LifecycleAction = "attend" | "no_show" | "cancel";

const DURATIONS = [15, 30, 45, 60, 90];
const CREATE_STATUSES = ["scheduled", "confirmed"] as const;
const OCCUPYING = new Set(["scheduled", "confirmed", "attended"]);
const TERMINAL = new Set(["attended", "no_show", "cancelled"]);

/**
 * Book a new appointment or edit/reschedule an existing one (pass `appointment`). New mode: customer
 * live search → details. Edit mode: the customer is fixed (rebook to move it), the rest is editable
 * and PATCHed. A client-side overlap pre-check warns when the chosen doctor's slot is taken
 * (excluding the appointment itself); the backend is authoritative — a true clash returns 409
 * `appointment_conflict`, surfaced inline. A terminal appointment (attended/cancelled/no-show) opens
 * read-only.
 */
export function AppointmentFormDialog({
  open,
  onClose,
  appointment,
  initialStart,
  initialDoctorId,
}: {
  open: boolean;
  onClose: () => void;
  appointment?: AppointmentResponse;
  initialStart?: Date;
  initialDoctorId?: string;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();

  const editing = !!appointment;
  const readOnly = !!appointment && TERMINAL.has(appointment.status);

  const create = useCreateAppointment();
  const update = useUpdateAppointment();
  const attend = useAttendAppointment();
  const cancelAppt = useCancelAppointment();
  const noShow = useNoShowAppointment();
  const doctors = useDoctorOptions();
  const services = useServices({ take: 200 });
  const editCustomer = useCustomer(editing ? (appointment?.customerId ?? null) : null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [petId, setPetId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [status, setStatus] = useState<(typeof CREATE_STATUSES)[number]>("scheduled");
  const [notes, setNotes] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<LifecycleAction | null>(null);

  const customersQuery = useCustomers({ search: debouncedSearch || undefined, take: 20 });
  const candidates = customersQuery.data ?? [];
  const petsQuery = usePets(customer ? { customerId: customer.id, take: 100 } : { take: 0 });
  const pets = customer ? (petsQuery.data ?? []) : [];

  // Initialise the editable fields when the dialog opens / target changes.
  useEffect(() => {
    if (!open) return;
    if (appointment) {
      setPetId(appointment.petId ?? "");
      setServiceId(appointment.serviceId ?? "");
      setDoctorId(appointment.doctorId ?? "");
      setScheduledAt(toDateTimeLocal(new Date(appointment.scheduledAt)));
      setDurationMin(appointment.durationMin ?? 30);
      setStatus(appointment.status === "confirmed" ? "confirmed" : "scheduled");
      setNotes(appointment.notes ?? "");
    } else {
      setSearch("");
      setPetId("");
      setServiceId("");
      setDoctorId(initialDoctorId ?? "");
      setScheduledAt(initialStart ? toDateTimeLocal(initialStart) : "");
      setDurationMin(30);
      setStatus("scheduled");
      setNotes("");
    }
    setServerError(null);
    setPendingAction(null);
  }, [open, appointment, initialStart, initialDoctorId]);

  // The customer chip: from the fetch in edit mode, reset to null (search) in create mode.
  useEffect(() => {
    if (!open) return;
    setCustomer(appointment ? (editCustomer.data ?? null) : null);
  }, [open, appointment, editCustomer.data]);

  // Drop a stale "not saved" conflict error once the user adjusts the slot/doctor/duration.
  useEffect(() => {
    setServerError(null);
  }, [scheduledAt, doctorId, durationMin]);

  // Pre-check the doctor's other appointments on the chosen day for an overlap (excluding this one).
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
    if (!s || Number.isNaN(s.getTime()) || !doctorId || readOnly) return null;
    const e = appointmentEnd(s, durationMin);
    return (
      (dayAppts.data ?? []).find(
        (a) =>
          a.id !== appointment?.id &&
          a.doctorId === doctorId &&
          OCCUPYING.has(a.status) &&
          windowsOverlap(s, e, new Date(a.scheduledAt), appointmentEnd(new Date(a.scheduledAt), a.durationMin)),
      ) ?? null
    );
  }, [dayAppts.data, scheduledAt, durationMin, doctorId, appointment?.id, readOnly]);

  const busy = create.isPending || update.isPending;
  const canSubmit = !!customer && !!doctorId && !!scheduledAt && !busy && !readOnly;
  const showDetails = editing || !!customer;

  const onSubmit = () => {
    if (!customer || !doctorId || !scheduledAt) return;
    setServerError(null);
    const onError = (e: ApiError) => {
      setServerError(
        e.code === "appointment_conflict" ? t("appointments.conflictError") : e.message,
      );
      toast.error(e.message);
    };

    if (appointment) {
      update.mutate(
        {
          id: appointment.id,
          body: {
            petId: petId || undefined,
            doctorId,
            serviceId: serviceId || undefined,
            scheduledAt: new Date(scheduledAt).toISOString(),
            durationMin,
            status,
            notes: notes.trim() || undefined,
          },
        },
        {
          onSuccess: () => {
            toast.success(t("appointments.updated"));
            onClose();
          },
          onError,
        },
      );
    } else {
      create.mutate(
        {
          customerId: customer.id,
          petId: petId || undefined,
          doctorId,
          serviceId: serviceId || undefined,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMin,
          status,
          notes: notes.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success(t("appointments.created"));
            onClose();
          },
          onError,
        },
      );
    }
  };

  const lifecycleBusy = attend.isPending || cancelAppt.isPending || noShow.isPending;

  const runAction = () => {
    if (!appointment || !pendingAction) return;
    const id = appointment.id;
    const fail = (e: ApiError) => toast.error(e.message);
    if (pendingAction === "attend") {
      attend.mutate(id, {
        onSuccess: async () => {
          toast.success(t("appointments.attended"));
          let visitId: string | null | undefined;
          try {
            visitId = (await getAppointment(apiClient, id)).visitId;
          } catch {
            /* the appointment is attended regardless; just can't deep-link */
          }
          onClose();
          if (visitId) navigate(`/operations/visits/${visitId}`);
        },
        onError: fail,
      });
    } else if (pendingAction === "cancel") {
      cancelAppt.mutate(id, {
        onSuccess: () => {
          toast.success(t("appointments.cancelled"));
          onClose();
        },
        onError: fail,
      });
    } else {
      noShow.mutate(id, {
        onSuccess: () => {
          toast.success(t("appointments.noShowed"));
          onClose();
        },
        onError: fail,
      });
    }
  };

  const confirmMessage =
    pendingAction === "attend"
      ? t("appointments.confirmAttend")
      : pendingAction === "cancel"
        ? t("appointments.confirmCancel")
        : t("appointments.confirmNoShow");

  const title = editing
    ? readOnly
      ? t("appointments.detailTitle")
      : t("appointments.editTitle")
    : t("appointments.newTitle");

  return (
    <Dialog open={open} onClose={onClose} title={title} className="max-w-xl">
      <div className="space-y-4">
        {editing && appointment ? (
          <div className="flex items-center gap-2">
            <Badge variant={appointmentStatusVariant(appointment.status)}>
              {t(`appointmentStatus.${appointment.status}`, { defaultValue: appointment.status })}
            </Badge>
            {readOnly ? (
              <span className="text-xs text-muted-foreground">{t("appointments.lockedHint")}</span>
            ) : null}
          </div>
        ) : null}

        {/* Step 1 — customer (fixed in edit mode) */}
        {editing ? (
          <div className="rounded-xl border bg-[var(--paper-soft)] p-3">
            <span className="text-xs text-muted-foreground">{t("appointments.customer")}</span>
            <span className="block truncate font-medium">
              {customer?.fullName ?? editCustomer.data?.fullName ?? "…"}
            </span>
          </div>
        ) : customer ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border bg-[var(--paper-soft)] p-3">
            <span className="min-w-0">
              <span className="text-xs text-muted-foreground">{t("appointments.customer")}</span>
              <span className="block truncate font-medium">{customer.fullName}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setCustomer(null)}>
              {t("admin.common.edit")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder={t("appointments.searchCustomer")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-56 divide-y overflow-auto rounded-xl border">
              {candidates.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">{t("customers.empty")}</div>
              ) : (
                candidates.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      setCustomer(c);
                      setPetId("");
                    }}
                    className="flex w-full items-center justify-between gap-2 p-3 text-start text-sm transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{c.fullName}</span>
                      {c.phonePrimary ? (
                        <span className="ms-2 text-xs text-muted-foreground" dir="ltr">
                          {c.phonePrimary}
                        </span>
                      ) : null}
                    </span>
                    <Badge variant="secondary">
                      {t(`customerType.${c.type}`, { defaultValue: c.type })}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2 — appointment details */}
        {showDetails ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("appointments.pet")}>
              <Select value={petId} onChange={(e) => setPetId(e.target.value)} disabled={readOnly}>
                <option value="">{t("appointments.noPet")}</option>
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.species ? ` · ${p.species}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("appointments.doctor")}>
              <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} disabled={readOnly}>
                <option value="">{t("appointments.selectDoctor")}</option>
                {doctors.options.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("appointments.scheduledAt")}>
              <DatePicker
                withTime
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={readOnly}
              />
            </Field>
            <Field label={t("appointments.duration")}>
              <Select
                value={String(durationMin)}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                disabled={readOnly}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {t("appointments.minutesCount", { count: d })}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("appointments.service")}>
              <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)} disabled={readOnly}>
                <option value="">{t("appointments.noService")}</option>
                {(services.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameAr || s.nameLatin}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("appointments.statusLabel")}>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as (typeof CREATE_STATUSES)[number])}
                disabled={readOnly}
              >
                {CREATE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`appointmentStatus.${s}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("appointments.notes")}>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={readOnly}
                />
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
                {t("appointments.conflictWarning", {
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
        ) : null}

        {pendingAction ? (
          <div className="space-y-3 rounded-lg border bg-[var(--paper-soft)] p-3">
            <p className="text-sm">{confirmMessage}</p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPendingAction(null)}
                disabled={lifecycleBusy}
              >
                {t("appointments.confirmBack")}
              </Button>
              <Button
                variant={
                  pendingAction === "cancel"
                    ? "destructive"
                    : pendingAction === "attend"
                      ? "teal"
                      : "default"
                }
                onClick={runAction}
                disabled={lifecycleBusy}
              >
                {lifecycleBusy ? t("admin.common.saving") : t("appointments.confirmAction")}
              </Button>
            </div>
          </div>
        ) : readOnly ? (
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              {t("appointments.close")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {editing ? (
                <>
                  <Button
                    variant="teal"
                    size="sm"
                    onClick={() => setPendingAction("attend")}
                    disabled={busy}
                  >
                    {t("appointments.attend")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingAction("no_show")}
                    disabled={busy}
                  >
                    {t("appointments.noShow")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setPendingAction("cancel")}
                    disabled={busy}
                  >
                    {t("appointments.cancelAppt")}
                  </Button>
                </>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                {t("admin.common.cancel")}
              </Button>
              <Button onClick={onSubmit} disabled={!canSubmit}>
                {busy
                  ? t("admin.common.saving")
                  : editing
                    ? t("admin.common.save")
                    : t("appointments.book")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
