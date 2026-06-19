import { formatDate, type VaccinationResponse } from "@vet/shared";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { useCenterName } from "@/hooks/useCenterName";

export interface VaccinationCertificateDocumentProps {
  vaccination: VaccinationResponse;
  recipientName: string | null;
  ownerName: string | null;
  doctorName: string | null;
}

/**
 * Printable AR/EN vaccination certificate (A4, PRD §5.2). Rendered off-screen for `react-to-print`.
 * Bilingual by design (an owner-facing document), independent of the UI language.
 */
export const VaccinationCertificateDocument = forwardRef<HTMLDivElement, VaccinationCertificateDocumentProps>(
  function VaccinationCertificateDocument({ vaccination, recipientName, ownerName, doctorName }, ref) {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const centerName = useCenterName();
    const dash = "—";

    const rows: { ar: string; en: string; v: string }[] = [
      { ar: "اسم الحيوان", en: "Patient", v: recipientName || dash },
      { ar: "المالك", en: "Owner", v: ownerName || dash },
      { ar: "نوع اللقاح", en: "Vaccine", v: vaccination.vaccineType },
      { ar: "تاريخ الإعطاء", en: "Date given", v: formatDate(vaccination.dateGiven, lang) },
      {
        ar: "موعد الجرعة القادمة",
        en: "Next due",
        v: vaccination.nextDueDate ? formatDate(vaccination.nextDueDate, lang) : dash,
      },
    ];

    return (
      <div ref={ref} dir="rtl" className="bg-white p-10 text-navy-900" style={{ width: "210mm", fontFamily: "Tajawal, sans-serif" }}>
        <div className="rounded-2xl border-2 border-teal-600 p-8">
          <div className="text-center">
            <h1 className="text-2xl font-extrabold" dir="auto">{centerName}</h1>
            <div className="my-5 border-t" />
            <h2 className="text-xl font-bold text-teal-700">شهادة تطعيم</h2>
            <p className="text-sm font-semibold tracking-wide text-teal-700">VACCINATION CERTIFICATE</p>
          </div>

          <table className="mx-auto mt-8 w-full max-w-xl border-collapse text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.en} className="border-b">
                  <td className="py-3 text-start align-top">
                    <div className="font-bold">{r.ar}</div>
                    <div className="text-xs text-muted-foreground">{r.en}</div>
                  </td>
                  <td className="py-3 text-end font-semibold" dir="auto">
                    {r.v}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-12 flex items-end justify-between text-sm">
            <div>
              <div className="text-muted-foreground">
                {t("visits.certificate.issuedAt")} · Issued
              </div>
              <div className="font-medium" dir="ltr">
                {formatDate(new Date(), lang)}
              </div>
            </div>
            <div className="text-center">
              <div className="mb-1 font-medium">{doctorName || dash}</div>
              <div className="w-48 border-t pt-1 text-xs text-muted-foreground">
                {t("visits.certificate.signature")} · Signature &amp; stamp
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
