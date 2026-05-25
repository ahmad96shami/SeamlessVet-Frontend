import { type VaccinationResponse } from "@vet/shared";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { VaccinationCertificateDocument } from "@/routes/visits/VaccinationCertificateDocument";

/** A per-row "print certificate" action with its own off-screen printable certificate. */
export function VaccinationCertificate({
  vaccination,
  recipientName,
  ownerName,
  doctorName,
}: {
  vaccination: VaccinationResponse;
  recipientName: string | null;
  ownerName: string | null;
  doctorName: string | null;
}) {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${t("visits.certificate.title")} - ${vaccination.vaccineType}`,
  });

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        aria-label={t("visits.vaccinations.printCertificate")}
        onClick={() => handlePrint()}
      >
        <Icon.print className="size-4" />
      </Button>
      <div style={{ position: "absolute", left: "-9999px", top: 0 }} aria-hidden>
        <VaccinationCertificateDocument
          ref={printRef}
          vaccination={vaccination}
          recipientName={recipientName}
          ownerName={ownerName}
          doctorName={doctorName}
        />
      </div>
    </>
  );
}
