import {
  formatCurrency,
  formatDate,
  formatNumber,
  type StatementParams,
} from "@vet/shared";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";
import { Money } from "@/components/ui/money";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Icon } from "@/components/ui/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useStatement } from "@/queries/customers";
import { useFarmStatement } from "@/queries/farms";
import { StatementDocument } from "@/routes/customers/StatementDocument";

type RangeKey = "all" | "90d" | "year" | "custom";

const RANGES: { key: RangeKey; labelKey: string }[] = [
  { key: "all", labelKey: "customers.statement.rangeAll" },
  { key: "90d", labelKey: "customers.statement.range90" },
  { key: "year", labelKey: "customers.statement.rangeYear" },
  { key: "custom", labelKey: "customers.statement.rangeCustom" },
];

/** Maps the chosen range to inclusive ISO `from`/`to` bounds the backend statement endpoint expects. */
function rangeToParams(range: RangeKey, from: string, to: string): StatementParams {
  const now = new Date();
  if (range === "90d") {
    const f = new Date(now);
    f.setDate(f.getDate() - 90);
    return { from: f.toISOString() };
  }
  if (range === "year") {
    return { from: new Date(now.getFullYear(), 0, 1).toISOString() };
  }
  if (range === "custom") {
    const params: StatementParams = {};
    if (from) params.from = `${from}T00:00:00.000Z`;
    if (to) params.to = `${to}T23:59:59.999Z`;
    return params;
  }
  return {}; // all
}

/**
 * A ledger statement — running balance, date filter, print + WhatsApp share. Works for either a
 * customer's **own** ledger (`customerId`) or a farm ledger (`farmId`) — exactly one is supplied
 * (M16 split the ledger). The owner's name/phone drive the header, share text, and print document.
 */
export function StatementSection({
  customerId,
  farmId,
  ownerName,
  ownerPhone,
  fallbackBalance,
}: {
  customerId?: string;
  farmId?: string;
  ownerName: string;
  ownerPhone?: string | null;
  fallbackBalance: number;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [range, setRange] = useState<RangeKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const params = useMemo(
    () => rangeToParams(range, customFrom, customTo),
    [range, customFrom, customTo],
  );
  // Both hooks are always called (React rules); the inactive one is disabled by a null id.
  const isFarm = farmId != null;
  const customerStmt = useStatement(isFarm ? null : (customerId ?? null), params);
  const farmStmt = useFarmStatement(isFarm ? farmId : null, params);
  const query = isFarm ? farmStmt : customerStmt;
  const stmt = query.data;
  const entries = stmt?.entries ?? [];

  const { totalDebit, totalCredit } = useMemo(() => {
    let d = 0;
    let c = 0;
    for (const e of entries) {
      if (e.amount > 0) d += e.amount;
      else c += -e.amount;
    }
    return { totalDebit: d, totalCredit: c };
  }, [entries]);

  const periodLabel =
    range === "custom"
      ? [customFrom, customTo].filter(Boolean).join(" — ") || t("customers.statement.rangeCustom")
      : t(RANGES.find((r) => r.key === range)!.labelKey);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${t("customers.statement.reportTitle")} - ${ownerName}`,
  });

  const onShare = () => {
    const phone = (ownerPhone ?? "").replace(/\D/g, "");
    if (!phone) {
      toast.error(t("customers.statement.shareUnavailable"));
      return;
    }
    const lines = [
      `${t("customers.statement.reportTitle")} — ${ownerName}`,
      periodLabel,
      "──────────",
      ...entries
        .slice(-15)
        .map(
          (e) =>
            `${formatDate(e.createdAt, lang)}  ${t(`ledgerEntryType.${e.entryType}`, { defaultValue: e.entryType })}  ${formatCurrency(e.amount, lang)}`,
        ),
      "──────────",
      `${t("customers.statement.closing")}: ${formatCurrency(stmt?.closingBalance ?? fallbackBalance, lang)}`,
    ];
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`,
      "_blank",
      "noopener",
    );
  };

  const balanceClass = (n: number) =>
    n > 0 ? "text-destructive" : n < 0 ? "text-success" : "";

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{t("customers.statement.title")}</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onShare}>
            <Icon.send className="size-4" />
            {t("customers.statement.share")}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => handlePrint()}>
            <Icon.print className="size-4" />
            {t("customers.statement.print")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              range === r.key
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(r.labelKey)}
          </button>
        ))}
        {range === "custom" ? (
          <div className="flex items-center gap-2">
            <DatePicker
              containerClassName="w-40"
              aria-label={t("customers.statement.from")}
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span className="text-muted-foreground">—</span>
            <DatePicker
              containerClassName="w-40"
              aria-label={t("customers.statement.to")}
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("customers.statement.colDate")}</TableHead>
              <TableHead>{t("customers.statement.colRef")}</TableHead>
              <TableHead>{t("customers.statement.colType")}</TableHead>
              <TableHead>{t("customers.statement.colDescription")}</TableHead>
              <TableHead className="text-end">{t("customers.statement.colDebit")}</TableHead>
              <TableHead className="text-end">{t("customers.statement.colCredit")}</TableHead>
              <TableHead className="text-end">{t("customers.statement.colBalance")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-20 text-center">
                  <Icon.spinner className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-20 text-center text-sm text-muted-foreground">
                  {t("customers.statement.empty")}
                </TableCell>
              </TableRow>
            ) : (
              <>
                <TableRow className="text-muted-foreground hover:bg-transparent">
                  <TableCell colSpan={6}>{t("customers.statement.opening")}</TableCell>
                  <TableCell className="text-end font-medium">
                    <Money value={stmt?.openingBalance ?? 0} />
                  </TableCell>
                </TableRow>
                {entries.map((e) => {
                  const refId = e.invoiceId ?? e.receiptVoucherId;
                  return (
                    <TableRow key={e.id}>
                      {/* dir="ltr" cells need text-end (= right inside LTR) to line up with the
                          RTL headers; amount cells stay RTL so text-end = the header's left edge. */}
                      <TableCell className="text-end" dir="ltr">
                        {formatDate(e.createdAt, lang)}
                      </TableCell>
                      <TableCell className="text-end font-mono text-xs" dir="ltr">
                        {refId ? `#${refId.slice(0, 8)}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.amount < 0 ? "success" : "default"}>
                          {t(`ledgerEntryType.${e.entryType}`, { defaultValue: e.entryType })}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[16rem] truncate">{e.description ?? "—"}</TableCell>
                      <TableCell className="text-end">
                        {e.amount > 0 ? (
                          <Money value={e.amount} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-end text-success">
                        {e.amount < 0 ? (
                          <Money value={-e.amount} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className={cn("text-end font-medium", balanceClass(e.balanceAfter))}>
                        <Money value={e.balanceAfter} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </>
            )}
          </TableBody>
        </Table>

        {entries.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-[var(--paper-soft)] p-3 text-sm">
            <span className="text-muted-foreground">
              {t("customers.statement.movementsCount", { count: formatNumber(entries.length, lang) })}
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <span>
                {t("customers.statement.totalDebit")}:{" "}
                <b className="text-destructive" dir="ltr">
                  <Money value={totalDebit} />
                </b>
              </span>
              <span>
                {t("customers.statement.totalCredit")}:{" "}
                <b className="text-success" dir="ltr">
                  <Money value={totalCredit} />
                </b>
              </span>
              <span className="font-semibold">
                {t("customers.statement.closing")}:{" "}
                <b className={balanceClass(stmt?.closingBalance ?? 0)} dir="ltr">
                  <Money value={stmt?.closingBalance ?? 0} />
                </b>
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Off-screen printable document — react-to-print clones this node into a print iframe. */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }} aria-hidden>
        {stmt ? (
          <StatementDocument
            ref={printRef}
            customerName={ownerName}
            customerPhone={ownerPhone}
            periodLabel={periodLabel}
            entries={entries}
            openingBalance={stmt.openingBalance}
            closingBalance={stmt.closingBalance}
            totalDebit={totalDebit}
            totalCredit={totalCredit}
          />
        ) : null}
      </div>
    </section>
  );
}
