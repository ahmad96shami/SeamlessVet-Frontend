import { formatCurrency, formatDate, formatPercent } from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useCustomerLookup } from "@/hooks/useCustomerLookup";
import { useBatches } from "@/queries/batches";
import { useProfitPerBatch } from "@/queries/reports";
import { ReportExportButtons } from "@/routes/reports/ReportExportButtons";
import { ReportPageHeader } from "@/routes/reports/ReportPageHeader";
import { SummaryGrid, SummaryStat } from "@/routes/reports/SummaryStat";

export function ProfitPerBatchPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [batchId, setBatchId] = useState("");
  const batches = useBatches({ take: 200 });
  const customers = useCustomerLookup();
  const query = useProfitPerBatch(batchId || null);
  const d = query.data;

  const batchLabel = (customerId: string, startDate: string) =>
    `${customers.byId.get(customerId)?.fullName ?? customerId} · ${formatDate(startDate, lang)}`;

  return (
    <div className="space-y-4">
      <ReportPageHeader titleKey="reports.profitPerBatch.title" subtitleKey="reports.profitPerBatch.subtitle" />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={batchId} onChange={(e) => setBatchId(e.target.value)} containerClassName="w-72">
          <option value="">{t("reports.filters.selectBatch")}</option>
          {(batches.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {batchLabel(b.customerId, b.startDate)}
            </option>
          ))}
        </Select>
        <span className="flex-1" />
        {batchId ? <ReportExportButtons path="/reports/profit-per-batch" params={{ batchId }} /> : null}
      </div>

      {!batchId ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("reports.profitPerBatch.pickPrompt")}</p>
      ) : d ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {t("reports.profitPerBatch.system")}: {t(`entitlementSystem.${d.entitlementSystem}`, { defaultValue: d.entitlementSystem })}
            </Badge>
            <Badge variant={d.entitlementEnabled ? "success" : "secondary"}>
              {d.entitlementEnabled ? t("reports.profitPerBatch.enabled") : t("reports.profitPerBatch.disabled")}
            </Badge>
            <span className="cap-12 text-muted-foreground">{t("reports.common.asOf")} {formatDate(d.asOf, lang)}</span>
          </div>

          <SummaryGrid>
            <SummaryStat label={t("reports.profitPerBatch.revenue")} value={formatCurrency(d.revenue, lang)} />
            <SummaryStat label={t("reports.profitPerBatch.drugCost")} value={formatCurrency(d.drugCost, lang)} tone="red" />
            <SummaryStat label={t("reports.profitPerBatch.drugProfit")} value={formatCurrency(d.drugProfit, lang)} />
            <SummaryStat label={t("reports.profitPerBatch.examFee")} value={formatCurrency(d.examFee, lang)} />
            <SummaryStat
              label={t("reports.profitPerBatch.doctorShare")}
              value={formatCurrency(d.doctorShare, lang)}
              tone="amber"
              hint={d.ceilingApplied != null ? `${t("reports.profitPerBatch.ceiling")}: ${formatCurrency(d.ceilingApplied, lang)}` : undefined}
            />
            <SummaryStat label={t("reports.profitPerBatch.clinicShare")} value={formatCurrency(d.clinicShare, lang)} tone="teal" />
            <SummaryStat label={t("reports.profitPerBatch.distributed")} value={formatCurrency(d.distributedToPartners, lang)} tone="navy" />
            <SummaryStat label={t("reports.profitPerBatch.retained")} value={formatCurrency(d.retainedByClinic, lang)} tone="green" />
          </SummaryGrid>

          {d.partnerAllocations.length > 0 ? (
            <div className="card flush">
              <div className="card-head">
                <h3>{t("reports.clinicProfits.partnerSplit")}</h3>
              </div>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("reports.clinicProfits.colPartner")}</th>
                    <th className="num">{t("reports.clinicProfits.colSharePct")}</th>
                    <th className="num">{t("reports.clinicProfits.colAmount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {d.partnerAllocations.map((p) => (
                    <tr key={p.partnerId}>
                      <td className="font-medium">{p.displayName}</td>
                      <td className="num">{formatPercent(p.sharePercent, lang)}</td>
                      <td className="num font-semibold">{formatCurrency(p.amount, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
