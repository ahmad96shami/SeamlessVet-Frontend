import { formatDate, formatDateTime, formatNumber, type PetTimelineVisit } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { usePet, usePetTimeline } from "@/queries/pets";
import { useVaccinationCalendar, useVaccinations } from "@/queries/vaccinations";
import { visitStatusVariant } from "@/routes/visits/VisitsPage";

/** A pet's chronological medical timeline (M5 task 17) — all visits, with doctor/date filters. */
export function PetTimelinePage() {
  const { petId = "" } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const pet = usePet(petId || null);
  const { options: doctorOptions, byId: doctorById } = useDoctorOptions();

  const [tab, setTab] = useState<"visits" | "vaccinations">("visits");
  const [doctor, setDoctor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = useMemo(
    () => ({
      doctorId: doctor || undefined,
      from: from ? `${from}T00:00:00.000Z` : undefined,
      to: to ? `${to}T23:59:59.999Z` : undefined,
    }),
    [doctor, from, to],
  );
  const timeline = usePetTimeline(petId || null, params);
  const visits = timeline.data?.visits ?? [];
  const backTo = pet.data ? `/operations/customers/${pet.data.customerId}` : "/operations/customers";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to={backTo} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <Icon.chevronRight className="size-4 ltr:hidden" />
        <Icon.chevronLeft className="size-4 rtl:hidden" />
        {t("visits.timeline.back")}
      </Link>

      <header className="flex flex-wrap items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700">
          <Icon.stethoscope className="size-6" />
        </div>
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {pet.data?.name ?? t("visits.timeline.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("visits.timeline.subtitle")}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-1 border-b">
        {(["visits", "vaccinations"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(id === "visits" ? "visits.timeline.tabVisits" : "visits.timeline.tabVaccinations")}
          </button>
        ))}
      </div>

      {tab === "vaccinations" ? (
        <PetVaccinationsPanel petId={petId} lang={lang} />
      ) : (
        <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={doctor} onChange={(e) => setDoctor(e.target.value)} containerClassName="w-52">
          <option value="">{`${t("visits.timeline.filterDoctor")}: ${t("visits.timeline.allDoctors")}`}</option>
          {doctorOptions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <DatePicker
          containerClassName="w-40"
          aria-label={t("visits.timeline.from")}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <span className="text-muted-foreground">—</span>
        <DatePicker
          containerClassName="w-40"
          aria-label={t("visits.timeline.to")}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      {timeline.isLoading ? (
        <div className="grid h-24 place-items-center rounded-2xl border">
          <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : visits.length === 0 ? (
        <div className="grid h-24 place-items-center rounded-2xl border text-sm text-muted-foreground">
          {t("visits.timeline.empty")}
        </div>
      ) : (
        <ol className="space-y-3">
          {visits.map((v) => (
            <TimelineCard key={v.visitId} visit={v} doctorName={doctorById.get(v.doctorId)} lang={lang} />
          ))}
        </ol>
      )}
        </>
      )}
    </div>
  );
}

function TimelineCard({
  visit,
  doctorName,
  lang,
}: {
  visit: PetTimelineVisit;
  doctorName?: string;
  lang: string;
}) {
  const { t } = useTranslation();
  const diagnosis = visit.finalDiagnosis || visit.preliminaryDiagnosis;
  const stats: { n: number; label: string }[] = [
    { n: visit.procedures.length, label: t("visits.timeline.procedures") },
    { n: visit.prescriptions.length, label: t("visits.timeline.prescriptions") },
    { n: visit.vaccinations.length, label: t("visits.timeline.vaccinations") },
  ];

  return (
    <li className="rounded-2xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        {visit.startedAt ? (
          <span className="text-sm font-medium" dir="ltr">
            {formatDateTime(visit.startedAt, lang)}
          </span>
        ) : null}
        <Badge variant={visitStatusVariant(visit.status)}>
          {t(`visitStatus.${visit.status}`, { defaultValue: visit.status })}
        </Badge>
        <Badge variant="secondary">{t(`visitType.${visit.visitType}`, { defaultValue: visit.visitType })}</Badge>
        {visit.visitNumber ? (
          <span className="font-mono text-xs text-muted-foreground" dir="ltr">
            {visit.visitNumber}
          </span>
        ) : null}
        <span className="flex-1" />
        {doctorName ? <span className="text-sm text-muted-foreground">{doctorName}</span> : null}
        <Link
          to={`/operations/visits/${visit.visitId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          {t("visits.timeline.openVisit")}
          <Icon.chevronLeft className="size-4 ltr:hidden" />
          <Icon.chevronRight className="size-4 rtl:hidden" />
        </Link>
      </div>

      {diagnosis ? <p className="mt-2 text-sm">{diagnosis}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {stats.map((s) => (
          <span
            key={s.label}
            className="rounded-full bg-ink-50 px-3 py-1 text-xs text-navy-900"
          >
            {formatNumber(s.n, lang)} {s.label}
          </span>
        ))}
        {visit.vaccinations.map((vac) => (
          <Badge key={vac.id} variant="success">
            {vac.vaccineType}
          </Badge>
        ))}
      </div>
    </li>
  );
}

/** The pet's vaccinations — upcoming/due (GET /vaccinations/upcoming) + administered (GET /vaccinations). */
function PetVaccinationsPanel({ petId, lang }: { petId: string; lang: string }) {
  const { t } = useTranslation();
  const upcoming = useVaccinationCalendar({ petId, take: 200 }, !!petId);
  const history = useVaccinations({ petId, take: 200 }, !!petId);
  const upcomingRows = upcoming.data ?? [];
  const historyRows = history.data ?? [];

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t("visits.timeline.vaccUpcoming")}</h2>
        {upcoming.isLoading ? (
          <div className="grid h-20 place-items-center rounded-2xl border">
            <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : upcomingRows.length === 0 ? (
          <div className="grid h-20 place-items-center rounded-2xl border text-sm text-muted-foreground">
            {t("visits.timeline.vaccUpcomingEmpty")}
          </div>
        ) : (
          <ul className="space-y-2">
            {upcomingRows.map((v) => (
              <li key={v.id} className="flex items-center gap-2 rounded-xl border p-3">
                <Badge variant="success">{v.vaccineType}</Badge>
                <span className="flex-1" />
                {v.nextDueDate ? (
                  <span className="text-sm text-muted-foreground" dir="ltr">
                    {formatDate(v.nextDueDate, lang)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">{t("visits.timeline.vaccHistory")}</h2>
        {history.isLoading ? (
          <div className="grid h-20 place-items-center rounded-2xl border">
            <Icon.spinner className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : historyRows.length === 0 ? (
          <div className="grid h-20 place-items-center rounded-2xl border text-sm text-muted-foreground">
            {t("visits.timeline.vaccHistoryEmpty")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-start font-medium">{t("visits.vaccinations.col.type")}</th>
                  <th className="p-3 text-start font-medium">{t("visits.vaccinations.col.given")}</th>
                  <th className="p-3 text-start font-medium">{t("visits.vaccinations.col.due")}</th>
                  <th className="p-3 text-start font-medium">{t("visits.vaccinations.col.price")}</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="p-3 font-medium">{v.vaccineType}</td>
                    <td className="p-3" dir="ltr">
                      {formatDate(v.dateGiven, lang)}
                    </td>
                    <td className="p-3" dir="ltr">
                      {v.nextDueDate ? formatDate(v.nextDueDate, lang) : "—"}
                    </td>
                    <td className="p-3">
                      {v.price != null ? (
                        <Money value={v.price} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
