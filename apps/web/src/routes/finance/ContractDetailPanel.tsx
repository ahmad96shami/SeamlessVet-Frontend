import type { ReactNode } from "react";

import { formatCurrency, formatDate, type ContractResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DateRange } from "@/components/ui/date-range";
import { ContractFarms } from "@/routes/finance/ContractFarms";
import { ContractMedicationPrices } from "@/routes/finance/ContractMedicationPrices";
import { contractStatusVariant } from "@/routes/finance/statusVariants";

function Kv({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/**
 * Right-rail detail for the selected contract: status, terms, and the medication-price overrides.
 * `footer` carries the per-status actions (edit in W8.2; the lifecycle buttons land in W8.3).
 */
export function ContractDetailPanel({
  contract,
  customerName,
  doctorName,
  footer,
}: {
  contract: ContractResponse;
  customerName: string;
  doctorName: string;
  footer?: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isDraft = contract.status === "draft";

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-navy-900">{customerName}</div>
          {contract.animalType ? (
            <div className="text-xs text-muted-foreground">{contract.animalType}</div>
          ) : null}
        </div>
        <Badge variant={contractStatusVariant(contract.status)}>
          {t(`contractStatus.${contract.status}`, { defaultValue: contract.status })}
        </Badge>
      </div>

      <div>
        <Kv
          label={t("finance.contracts.colPeriod")}
          value={<DateRange start={contract.periodStart} end={contract.periodEnd} />}
        />
        <Kv
          label={t("finance.contracts.totalPrice")}
          value={contract.totalPrice != null ? formatCurrency(contract.totalPrice, lang) : "—"}
        />
        <Kv
          label={t("finance.contracts.expectedVisitCount")}
          value={contract.expectedVisitCount ?? "—"}
        />
        <Kv label={t("finance.contracts.animalCount")} value={contract.animalCount ?? "—"} />
        <Kv label={t("finance.contracts.responsibleDoctor")} value={doctorName} />
        {contract.activatedAt ? (
          <Kv
            label={t("contractStatus.active")}
            value={<span dir="ltr">{formatDate(contract.activatedAt, lang)}</span>}
          />
        ) : null}
      </div>

      <div className="border-t pt-3">
        <ContractFarms contractId={contract.id} customerId={contract.customerId} isDraft={isDraft} />
      </div>

      <div className="border-t pt-3">
        <ContractMedicationPrices contractId={contract.id} isDraft={isDraft} />
      </div>

      {footer ? <div className="border-t pt-3">{footer}</div> : null}
    </Card>
  );
}
