import { fetchReportFile, type ReportExportFormat } from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { downloadBlob } from "@/lib/downloadBlob";
import { apiClient } from "@/services/apiClient";

/**
 * PDF / Excel export buttons for a report. Hits the same endpoint with `?format=`, streams the
 * server-generated Arabic/RTL file (ClosedXML xlsx · QuestPDF pdf), and saves it under the
 * server-suggested filename. `params` are the report's current filters (period, doctor, …).
 */
export function ReportExportButtons({
  path,
  params,
  disabled,
}: {
  path: string;
  params?: Record<string, unknown>;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<ReportExportFormat | null>(null);

  const run = async (format: ReportExportFormat) => {
    setBusy(format);
    try {
      const file = await fetchReportFile(apiClient, path, format, params);
      downloadBlob(file.blob, file.filename);
    } catch {
      toast.error(t("reports.export.failed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy !== null}
        onClick={() => run("pdf")}
      >
        <Icon.print className="size-4" />
        {busy === "pdf" ? t("reports.export.exporting") : t("reports.export.pdf")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy !== null}
        onClick={() => run("xlsx")}
      >
        <Icon.print className="size-4" />
        {busy === "xlsx" ? t("reports.export.exporting") : t("reports.export.excel")}
      </Button>
    </div>
  );
}
