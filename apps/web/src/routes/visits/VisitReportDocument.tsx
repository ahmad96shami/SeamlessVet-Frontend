import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  type PrescriptionResponse,
  type ProcedureResponse,
  type VisitResponse,
} from "@vet/shared";
import { forwardRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { visitRef } from "@/routes/visits/VisitsPage";

export interface VisitReportDocumentProps {
  visit: VisitResponse;
  petLabel: string | null;
  ownerName: string | null;
  doctorName: string | null;
  procedures: ProcedureResponse[];
  prescriptions: PrescriptionResponse[];
  serviceById: Map<string, string>;
  productById: Map<string, string>;
}

/**
 * Printable Final Visit Report (A4, PRD §5.2-H). Rendered off-screen; `react-to-print` clones this
 * node into a print iframe. Self-contained, RTL Arabic. Assembled client-side from the visit + its
 * procedures and prescriptions.
 */
export const VisitReportDocument = forwardRef<HTMLDivElement, VisitReportDocumentProps>(
  function VisitReportDocument(
    { visit, petLabel, ownerName, doctorName, procedures, prescriptions, serviceById, productById },
    ref,
  ) {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;

    const kv: { k: string; v: string }[] = [
      petLabel ? { k: t("visits.col.pet"), v: petLabel } : null,
      ownerName ? { k: t("visits.detail.owner"), v: ownerName } : null,
      { k: t("visits.detail.visitNumber"), v: visitRef(visit) },
      visit.startedAt ? { k: t("visits.detail.startedAt"), v: formatDateTime(visit.startedAt, lang) } : null,
      doctorName ? { k: t("visits.report.doctor"), v: doctorName } : null,
    ].filter(Boolean) as { k: string; v: string }[];

    const vitals: { k: string; v: string }[] = [
      visit.temperature != null ? { k: t("visits.assessment.temperature"), v: formatNumber(visit.temperature, lang) } : null,
      visit.heartRate != null ? { k: t("visits.assessment.heartRate"), v: formatNumber(visit.heartRate, lang) } : null,
      visit.respiratoryRate != null ? { k: t("visits.assessment.respiratoryRate"), v: formatNumber(visit.respiratoryRate, lang) } : null,
      visit.weight != null ? { k: t("visits.assessment.weight"), v: formatNumber(visit.weight, lang) } : null,
    ].filter(Boolean) as { k: string; v: string }[];

    const none = t("visits.report.none");

    return (
      <div ref={ref} dir="rtl" className="bg-white p-8 text-navy-900" style={{ width: "210mm", fontFamily: "Tajawal, sans-serif" }}>
        <div className="mb-6 flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-xl font-extrabold">{t("appName")}</h1>
            <p className="text-sm text-muted-foreground">{t("shell.center")}</p>
          </div>
          <div className="text-end">
            <h2 className="text-lg font-bold">{t("visits.report.title")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("customers.statement.generatedAt", { date: formatDateTime(new Date(), lang) })}
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          {kv.map((row) => (
            <div key={row.k} className="flex justify-between gap-3 border-b border-dashed py-1">
              <span className="text-muted-foreground">{row.k}</span>
              <span className="font-medium" dir="auto">{row.v}</span>
            </div>
          ))}
        </div>

        <Section title={t("visits.report.diagnosisSummary")}>
          <p className="text-sm">
            <b>{t("visits.diagnosis.preliminary")}:</b> {visit.preliminaryDiagnosis || none}
          </p>
          <p className="text-sm">
            <b>{t("visits.diagnosis.final")}:</b> {visit.finalDiagnosis || none}
          </p>
          {visit.severity ? (
            <p className="text-sm">
              <b>{t("visits.diagnosis.severity")}:</b> {t(`severity.${visit.severity}`, { defaultValue: visit.severity })}
            </p>
          ) : null}
        </Section>

        {vitals.length > 0 ? (
          <Section title={t("visits.report.vitals")}>
            <div className="flex flex-wrap gap-4 text-sm" dir="ltr">
              {vitals.map((v) => (
                <span key={v.k}>
                  <b>{v.k}:</b> {v.v}
                </span>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title={t("visits.report.procedures")}>
          {procedures.length === 0 ? (
            <p className="text-sm text-muted-foreground">{none}</p>
          ) : (
            <table className="w-full border-collapse text-sm" style={{ direction: "rtl" }}>
              <thead>
                <tr className="border-y bg-[var(--paper-soft)]">
                  <th className="p-2 text-start font-semibold">{t("visits.procedures.col.service")}</th>
                  <th className="p-2 text-start font-semibold">{t("visits.procedures.col.result")}</th>
                  <th className="p-2 text-end font-semibold">{t("visits.procedures.col.price")}</th>
                </tr>
              </thead>
              <tbody>
                {procedures.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-2">{(p.serviceId && serviceById.get(p.serviceId)) || t("visits.procedures.noService")}</td>
                    <td className="p-2">{p.resultText || "—"}</td>
                    <td className="p-2 text-end" dir="ltr">{formatCurrency(p.price, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title={t("visits.report.prescriptions")}>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{none}</p>
          ) : (
            <table className="w-full border-collapse text-sm" style={{ direction: "rtl" }}>
              <thead>
                <tr className="border-y bg-[var(--paper-soft)]">
                  <th className="p-2 text-start font-semibold">{t("visits.prescriptions.col.product")}</th>
                  <th className="p-2 text-start font-semibold">{t("visits.prescriptions.col.dosage")}</th>
                  <th className="p-2 text-start font-semibold">{t("visits.prescriptions.col.frequency")}</th>
                  <th className="p-2 text-start font-semibold">{t("visits.prescriptions.col.duration")}</th>
                  <th className="p-2 text-start font-semibold">{t("visits.prescriptions.col.dispense")}</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="p-2">{productById.get(p.productId) || "—"}</td>
                    <td className="p-2">{p.dosage || "—"}</td>
                    <td className="p-2">{p.frequency || "—"}</td>
                    <td className="p-2">{p.duration || "—"}</td>
                    <td className="p-2">{t(`dispenseType.${p.dispenseType}`, { defaultValue: p.dispenseType })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {visit.clinicalNotes ? (
          <Section title={t("visits.report.recommendations")}>
            <p className="whitespace-pre-wrap text-sm">{visit.clinicalNotes}</p>
          </Section>
        ) : null}
      </div>
    );
  },
);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="mb-1 text-sm font-bold text-teal-700">{title}</h3>
      {children}
    </div>
  );
}
