import { type VisitResponse } from "@vet/shared";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { usePrescriptions } from "@/queries/prescriptions";
import { useProcedures } from "@/queries/procedures";
import { useProducts } from "@/queries/products";
import { useServices } from "@/queries/services";
import { VisitReportDocument } from "@/routes/visits/VisitReportDocument";
import { visitRef } from "@/routes/visits/VisitsPage";

/** "Print report" action — assembles the Final Visit Report from the visit's data and prints it. */
export function VisitReportButton({
  visit,
  petLabel,
  ownerName,
  doctorName,
}: {
  visit: VisitResponse;
  petLabel: string | null;
  ownerName: string | null;
  doctorName: string | null;
}) {
  const { t } = useTranslation();
  const procedures = useProcedures(visit.id);
  const prescriptions = usePrescriptions(visit.id);
  const services = useServices({ take: 200 });
  const products = useProducts({ take: 200 });

  const serviceById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of services.data ?? []) m.set(s.id, s.nameAr);
    return m;
  }, [services.data]);
  const productById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products.data ?? []) m.set(p.id, p.nameAr);
    return m;
  }, [products.data]);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${t("visits.report.title")} - ${visitRef(visit)}`,
  });

  return (
    <>
      <Button variant="secondary" onClick={() => handlePrint()}>
        <Icon.print className="size-4" />
        {t("visits.report.action")}
      </Button>

      <div style={{ position: "absolute", left: "-9999px", top: 0 }} aria-hidden>
        <VisitReportDocument
          ref={printRef}
          visit={visit}
          petLabel={petLabel}
          ownerName={ownerName}
          doctorName={doctorName}
          procedures={procedures.data ?? []}
          prescriptions={prescriptions.data ?? []}
          serviceById={serviceById}
          productById={productById}
        />
      </div>
    </>
  );
}
