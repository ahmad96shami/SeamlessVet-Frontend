import {
  APPOINTMENT_STATUS_VALUES,
  formatDate,
  type AppointmentResponse,
} from "@vet/shared";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { AdminPage } from "@/components/layout/AdminPage";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import {
  addDays,
  addMonths,
  startOfDay,
  viewRange,
  weekDays,
  CALENDAR_VIEWS,
  type CalendarView,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { useAppointments } from "@/queries/appointments";
import { useCustomers } from "@/queries/customers";
import { usePets } from "@/queries/pets";
import { AppointmentFormDialog } from "@/routes/appointments/AppointmentFormDialog";
import { MonthGrid } from "@/routes/appointments/MonthGrid";
import { TimeGrid, type AppointmentLabel } from "@/routes/appointments/TimeGrid";

export function AppointmentsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [doctorId, setDoctorId] = useState("");
  const [status, setStatus] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formStart, setFormStart] = useState<Date | undefined>(undefined);
  const [editAppt, setEditAppt] = useState<AppointmentResponse | null>(null);

  const range = useMemo(() => viewRange(view, anchor), [view, anchor]);
  const doctors = useDoctorOptions();

  // The backend caps `take` at 200; the from/to range keeps a day/week well under that. A very busy
  // month could exceed it — acceptable for now (the range already scopes the query server-side).
  const query = useAppointments({
    doctorId: doctorId || undefined,
    status: status || undefined,
    from: range.from,
    to: range.to,
    take: 200,
  });
  const appointments = query.data ?? [];

  // Client-side reference joins (the W2/W4 precedent): resolve customer/pet ids to names from a
  // capped, cached page of each list. Doctor names come from the shared doctor-options hook.
  const customers = useCustomers({ take: 200 });
  const pets = usePets({ take: 200 });
  const customerById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers.data ?? []) m.set(c.id, c.fullName);
    return m;
  }, [customers.data]);
  const petById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pets.data ?? []) m.set(p.id, p.name);
    return m;
  }, [pets.data]);

  const labelFor = useCallback(
    (a: AppointmentResponse): AppointmentLabel => {
      const petName = a.petId ? petById.get(a.petId) : undefined;
      const customerName = a.customerId ? customerById.get(a.customerId) : undefined;
      const primary = petName ?? customerName ?? a.notes?.trim() ?? t("appointments.untitled");
      const secondary = petName ? customerName : null;
      const doctorName = a.doctorId
        ? (doctors.byId.get(a.doctorId) ?? t("appointments.unknownDoctor"))
        : null;
      return { primary, secondary, doctorName };
    },
    [petById, customerById, doctors.byId, t],
  );

  const shift = (dir: -1 | 1) =>
    setAnchor((a) =>
      view === "month" ? addMonths(a, dir) : view === "week" ? addDays(a, 7 * dir) : addDays(a, dir),
    );
  const goToday = () => setAnchor(startOfDay(new Date()));
  const openDay = (d: Date) => {
    setAnchor(startOfDay(d));
    setView("day");
  };
  const openNew = () => {
    setEditAppt(null);
    const s = new Date(anchor);
    s.setHours(9, 0, 0, 0);
    setFormStart(s);
    setFormOpen(true);
  };
  const openSlot = (start: Date) => {
    setEditAppt(null);
    setFormStart(start);
    setFormOpen(true);
  };
  const openAppointment = (a: AppointmentResponse) => {
    setEditAppt(a);
    setFormOpen(true);
  };

  const rangeLabel = useMemo(() => {
    if (view === "day") return formatDate(anchor, lang, "EEEE، d MMMM yyyy");
    if (view === "month") return formatDate(anchor, lang, "MMMM yyyy");
    const d = weekDays(anchor);
    const a = d[0] ?? anchor;
    const b = d[d.length - 1] ?? a;
    return a.getMonth() === b.getMonth()
      ? `${formatDate(a, lang, "d")} – ${formatDate(b, lang, "d MMMM yyyy")}`
      : `${formatDate(a, lang, "d MMM")} – ${formatDate(b, lang, "d MMM yyyy")}`;
  }, [view, anchor, lang]);

  return (
    <AdminPage
      title={t("appointments.title")}
      description={t("appointments.description")}
      actions={
        <Button onClick={openNew}>
          <Icon.plus className="size-4" />
          {t("appointments.new")}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* View switcher + date navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border p-1">
            {CALENDAR_VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-bold transition-colors",
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`appointments.view.${v}`)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToday}>
              {t("appointments.today")}
            </Button>
            <button
              type="button"
              className="icon-pill"
              aria-label={t("appointments.prev")}
              onClick={() => shift(-1)}
            >
              <Icon.chevronRight className="size-4 ltr:hidden" />
              <Icon.chevronLeft className="size-4 rtl:hidden" />
            </button>
            <button
              type="button"
              className="icon-pill"
              aria-label={t("appointments.next")}
              onClick={() => shift(1)}
            >
              <Icon.chevronLeft className="size-4 ltr:hidden" />
              <Icon.chevronRight className="size-4 rtl:hidden" />
            </button>
            <span className="min-w-40 text-sm font-bold tabular-nums" dir="auto">
              {rangeLabel}
            </span>
          </div>
        </div>

        {/* Doctor filter chips + status filter */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setDoctorId("")}
            className={cn("chip", doctorId === "" && "active")}
          >
            {t("appointments.allDoctors")}
          </button>
          {doctors.options.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDoctorId(d.id)}
              className={cn("chip", doctorId === d.id && "active")}
            >
              {d.name}
            </button>
          ))}
          <div className="ms-auto">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              containerClassName="w-48"
            >
              <option value="">{`${t("appointments.filterStatus")}: ${t("appointments.allStatuses")}`}</option>
              {APPOINTMENT_STATUS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {t(`appointmentStatus.${s}`)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Calendar */}
        <div className="card flush relative overflow-hidden">
          {query.isLoading ? (
            <div className="grid h-64 place-items-center">
              <Icon.spinner className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : view === "month" ? (
            <MonthGrid
              days={range.days}
              month={anchor.getMonth()}
              appointments={appointments}
              labelFor={labelFor}
              onSelectDay={openDay}
            />
          ) : (
            <TimeGrid
              days={range.days}
              appointments={appointments}
              labelFor={labelFor}
              onSelectDay={view === "week" ? openDay : undefined}
              onSelectSlot={openSlot}
              onSelectAppointment={openAppointment}
            />
          )}
        </div>

        {!query.isLoading && appointments.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">{t("appointments.empty")}</p>
        ) : null}
      </div>

      {formOpen ? (
        <AppointmentFormDialog
          open
          onClose={() => setFormOpen(false)}
          appointment={editAppt ?? undefined}
          initialStart={formStart}
          initialDoctorId={doctorId || undefined}
        />
      ) : null}
    </AdminPage>
  );
}
