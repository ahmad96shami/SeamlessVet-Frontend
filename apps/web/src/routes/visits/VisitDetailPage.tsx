import { formatDateTime } from "@vet/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useCustomer } from "@/queries/customers";
import { usePets } from "@/queries/pets";
import { useSystemSettings } from "@/queries/systemSettings";
import { useCancelVisit, useCompleteVisit, useUpdateVisit, useVisit } from "@/queries/visits";
import { AssessmentTab } from "@/routes/visits/AssessmentTab";
import { AttachmentsTab } from "@/routes/visits/AttachmentsTab";
import { CheckupFeeCard } from "@/routes/visits/CheckupFeeCard";
import { DiagnosisTab } from "@/routes/visits/DiagnosisTab";
import { FollowUpsTab } from "@/routes/visits/FollowUpsTab";
import { NightStaysTab } from "@/routes/visits/NightStaysTab";
import { PrescriptionsTab } from "@/routes/visits/PrescriptionsTab";
import { ProceduresTab } from "@/routes/visits/ProceduresTab";
import { ScheduleFollowUpDialog } from "@/routes/visits/ScheduleFollowUpDialog";
import { useVisitTabBadges } from "@/routes/visits/useVisitTabBadges";
import { VaccinationsTab } from "@/routes/visits/VaccinationsTab";
import { VisitReportButton } from "@/routes/visits/VisitReportButton";
import { visitRef, visitStatusVariant } from "@/routes/visits/VisitsPage";
import { useAuthStore } from "@/stores/authStore";

type TabId =
  | "assessment"
  | "diagnosis"
  | "procedures"
  | "prescriptions"
  | "followups"
  | "vaccinations"
  | "nightStays"
  | "files";

// `nightStays` is clinic-only (the backend rejects boarding on a field visit) and `followups`
// belongs right after it (related workflows) — both are appended in `tabIds` below.
const BASE_TAB_IDS = [
  "assessment",
  "diagnosis",
  "procedures",
  "prescriptions",
  "vaccinations",
] as const satisfies readonly TabId[];

export function VisitDetailPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const query = useVisit(id || null);
  const v = query.data;

  const customer = useCustomer(v?.customerId ?? null);
  const pets = usePets(v ? { customerId: v.customerId, take: 100 } : { take: 0 });
  const { byId: doctorById } = useDoctorOptions();

  const update = useUpdateVisit();
  const complete = useCompleteVisit();
  const cancel = useCancelVisit();
  // Per-tab content indicators (counts for record tabs, a dot for the form tabs).
  const badges = useVisitTabBadges(v);

  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  const [tab, setTab] = useState<TabId>("assessment");
  const [confirm, setConfirm] = useState<null | "complete" | "cancel">(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  // M23 — بدء الكشف confirms the (editable) checkup fee before unlocking clinical work.
  const [startOpen, setStartOpen] = useState(false);
  const [startFee, setStartFee] = useState("");
  const settings = useSystemSettings();

  const pet = useMemo(
    () => (v?.petId ? (pets.data ?? []).find((p) => p.id === v.petId) : undefined),
    [v?.petId, pets.data],
  );
  const doctorName = useMemo(
    () => (v ? doctorById.get(v.doctorId) : undefined),
    [v, doctorById],
  );

  if (query.isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Icon.spinner className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (query.isError || !v) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <BackLink label={t("visits.detail.back")} />
        <p className="text-sm text-muted-foreground">{t("visits.detail.notFound")}</p>
      </div>
    );
  }

  const isTerminal = v.status === "completed" || v.status === "cancelled";
  const isOpen = v.status === "open";
  const isClinic = v.visitType === "in_clinic";
  // M23 — clinical work waits for بدء الكشف on clinic visits (the fee-confirmation moment);
  // assessment (triage vitals) stays editable. Field visits are unaffected.
  const clinicalLocked = isClinic && isOpen;
  // 0 prefilled on an unused-waiver follow-up — surfaced as a hint in the start dialog.
  const startFeeDefault = v.checkupFeeApplied ?? settings.data?.defaultCheckupFee ?? 0;
  const startWaived = v.followUpOfVisitId != null && (v.checkupFeeApplied ?? 0) === 0;
  // Night-stays are clinic-only, with daily follow-ups right after them (related workflows).
  const tabIds: readonly TabId[] = isClinic
    ? ([...BASE_TAB_IDS, "nightStays", "followups", "files"] as const)
    : ([...BASE_TAB_IDS, "followups", "files"] as const);
  // Hand off to the cashier surface (admin/cashier only); a cancelled visit has nothing to bill.
  const canBill = (role === "admin" || role === "cashier") && v.status !== "cancelled";
  const title = pet?.name ?? customer.data?.fullName ?? "—";
  const petMeta = pet
    ? [pet.species, pet.breed, pet.sex ? t(`petSex.${pet.sex}`, { defaultValue: pet.sex }) : null]
        .filter(Boolean)
        .join(" · ")
    : null;
  const petLabel = pet ? [pet.name, pet.species].filter(Boolean).join(" · ") : null;
  const subBits = [
    customer.data ? `${t("visits.detail.owner")}: ${customer.data.fullName}` : null,
    `${t("visits.detail.visitNumber")} ${visitRef(v)}`,
    v.startedAt
      ? `${t("visits.detail.startedAt")} ${formatDateTime(v.startedAt, lang, "yyyy/MM/dd h:mm a")}`
      : null,
    doctorName,
  ].filter(Boolean) as string[];

  const busy = update.isPending || complete.isPending || cancel.isPending;

  // Field visits start directly; clinic visits go through the fee-confirm dialog (M23).
  const onStart = () => {
    if (isClinic) {
      setStartFee(String(startFeeDefault));
      setStartOpen(true);
      return;
    }
    update.mutate(
      { id: v.id, body: { status: "in_progress" } },
      { onSuccess: () => toast.success(t("visits.actions.started")) },
    );
  };
  const onConfirmStart = () => {
    const fee = startFee.trim() === "" ? startFeeDefault : Number(startFee);
    if (Number.isNaN(fee) || fee < 0) return;
    update.mutate(
      { id: v.id, body: { status: "in_progress", checkupFeeApplied: fee } },
      {
        onSuccess: () => {
          toast.success(t("visits.actions.started"));
          setStartOpen(false);
        },
      },
    );
  };
  const onComplete = () =>
    complete.mutate(v.id, {
      onSuccess: () => {
        toast.success(t("visits.actions.completed"));
        setConfirm(null);
      },
    });
  const onCancel = () =>
    cancel.mutate(v.id, {
      onSuccess: () => {
        toast.success(t("visits.actions.cancelled"));
        setConfirm(null);
      },
    });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink label={t("visits.detail.back")} />

      {/* Visit context bar */}
      <header className="flex flex-wrap items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700">
          <Icon.stethoscope className="size-7" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <Badge variant={visitStatusVariant(v.status)}>
              {t(`visitStatus.${v.status}`, { defaultValue: v.status })}
            </Badge>
            <Badge variant="secondary">
              {t(`visitType.${v.visitType}`, { defaultValue: v.visitType })}
            </Badge>
            {petMeta ? <span className="text-sm text-muted-foreground">{petMeta}</span> : null}
          </div>
          {subBits.length > 0 ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {subBits.map((bit, i) => (
                <span key={i} className="flex items-center gap-x-2 whitespace-nowrap">
                  {i > 0 ? <span aria-hidden className="text-ink-300">·</span> : null}
                  <span>{bit}</span>
                </span>
              ))}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VisitReportButton
            visit={v}
            petLabel={petLabel}
            ownerName={customer.data?.fullName ?? null}
            doctorName={doctorName ?? null}
          />
          {v.status !== "cancelled" ? (
            <Button variant="secondary" onClick={() => setFollowUpOpen(true)}>
              <Icon.clock className="size-4" />
              {t("visits.scheduleFollowUp.action")}
            </Button>
          ) : null}
          {canBill ? (
            <Button
              variant="secondary"
              onClick={() => navigate(`/pos?customerId=${v.customerId}&visitId=${v.id}`)}
            >
              <Icon.receipt className="size-4" />
              {t("visits.actions.ringUp")}
            </Button>
          ) : null}
          {!isTerminal ? (
            <>
              {isOpen ? (
                <Button variant="teal" onClick={onStart} disabled={busy}>
                  <Icon.check className="size-4" />
                  {t("visits.actions.start")}
                </Button>
              ) : null}
              {/* M23 — a clinic visit completes only after بدء الكشف (open→completed would skip
                  the fee server-side); field visits still complete from open. */}
              {!clinicalLocked ? (
                <Button onClick={() => setConfirm("complete")} disabled={busy}>
                  {t("visits.actions.complete")}
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => setConfirm("cancel")} disabled={busy}>
                {t("visits.actions.cancel")}
              </Button>
            </>
          ) : null}
        </div>
      </header>

      {isTerminal ? (
        <div className="rounded-xl border bg-[var(--paper-soft)] p-3 text-sm text-muted-foreground">
          {t("visits.detail.lockedHint")}
        </div>
      ) : null}

      {clinicalLocked ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Icon.lock className="size-4 shrink-0" aria-hidden />
          {t("visits.startExam.lockedHint")}
        </div>
      ) : null}

      {isClinic ? <CheckupFeeCard visit={v} readOnly={isTerminal} /> : null}

      {/* Clinical-record tabs — a count chip (record tabs) / dot (form tabs) marks the
          sections that already hold content, so staff see at a glance where work happened. */}
      <div className="flex flex-wrap gap-1 border-b">
        {tabIds.map((id) => {
          const badge = badges[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`visits.tab.${id}`)}
              {typeof badge === "number" ? (
                <span
                  className={cn(
                    "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                    tab === id ? "bg-teal-50 text-teal-700" : "bg-ink-100 text-muted-foreground",
                  )}
                  dir="ltr"
                >
                  {badge}
                </span>
              ) : badge ? (
                <span
                  aria-hidden
                  className={cn("size-1.5 rounded-full", tab === id ? "bg-teal-600" : "bg-ink-300")}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* M23 — clinical tabs (incl. daily follow-ups + files) are read-only until بدء الكشف on a
          clinic visit; only assessment (reception triage) stays editable while open. */}
      {tab === "assessment" ? <AssessmentTab visit={v} readOnly={isTerminal} /> : null}
      {tab === "diagnosis" ? <DiagnosisTab visit={v} readOnly={isTerminal || clinicalLocked} /> : null}
      {tab === "procedures" ? <ProceduresTab visitId={v.id} readOnly={isTerminal || clinicalLocked} /> : null}
      {tab === "prescriptions" ? <PrescriptionsTab visitId={v.id} readOnly={isTerminal || clinicalLocked} /> : null}
      {tab === "followups" ? <FollowUpsTab visit={v} readOnly={isTerminal || clinicalLocked} /> : null}
      {tab === "vaccinations" ? <VaccinationsTab visit={v} readOnly={isTerminal || clinicalLocked} /> : null}
      {tab === "nightStays" && isClinic ? (
        <NightStaysTab visitId={v.id} readOnly={isTerminal || clinicalLocked} />
      ) : null}
      {tab === "files" ? <AttachmentsTab visitId={v.id} readOnly={isTerminal || clinicalLocked} /> : null}

      {followUpOpen ? (
        <ScheduleFollowUpDialog open visit={v} onClose={() => setFollowUpOpen(false)} />
      ) : null}

      {/* M23 — بدء الكشف: confirm (and optionally edit) the checkup fee, then unlock clinical work. */}
      <Dialog open={startOpen} onClose={() => setStartOpen(false)} title={t("visits.startExam.title")}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("visits.startExam.body")}</p>
          {startWaived ? (
            <p className="text-sm text-teal-700">{t("visits.startExam.waivedHint")}</p>
          ) : null}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{t("visits.startExam.feeLabel")}</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              dir="ltr"
              className="w-32"
              value={startFee}
              onChange={(e) => setStartFee(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStartOpen(false)} disabled={busy}>
              {t("admin.common.cancel")}
            </Button>
            <Button variant="teal" onClick={onConfirmStart} disabled={busy}>
              <Icon.check className="size-4" />
              {t("visits.startExam.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "cancel" ? t("visits.actions.cancelTitle") : t("visits.actions.completeTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {confirm === "cancel" ? t("visits.actions.cancelBody") : t("visits.actions.completeBody")}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy}>
              {t("admin.common.cancel")}
            </Button>
            <Button
              variant={confirm === "cancel" ? "destructive" : "default"}
              onClick={confirm === "cancel" ? onCancel : onComplete}
              disabled={busy}
            >
              {confirm === "cancel" ? t("visits.actions.cancel") : t("visits.actions.complete")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      to="/operations/visits"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <Icon.chevronRight className="size-4 ltr:hidden" />
      <Icon.chevronLeft className="size-4 rtl:hidden" />
      {label}
    </Link>
  );
}
