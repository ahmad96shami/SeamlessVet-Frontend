import { formatDate, formatNumber } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRange } from "@/components/ui/date-range";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useBatchSettlementPreview, useSettleBatch } from "@/queries/batchSettlements";

/**
 * تصفية الدورة (M24) — the end-of-cycle renegotiation screen. One settled price per medication
 * applied across ALL the batch's effective invoices, plus a batch-level discount; confirming closes
 * the cycle, posts the ledger adjustments, computes the doctor's share on the settled numbers, and
 * freezes the batch's invoices. The deltas shown here are display estimates off the per-product
 * aggregation — the server recomputes authoritatively per line on confirm.
 */
export function BatchSettlementPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();

  const preview = useBatchSettlementPreview(id || null);
  const settle = useSettleBatch();

  // Settled-price inputs keyed by product — prefilled with the weighted average (delta-neutral).
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const data = preview.data;

  useEffect(() => {
    if (!data) return;
    setPrices((prev) =>
      Object.keys(prev).length > 0
        ? prev
        : Object.fromEntries(data.products.map((p) => [p.productId, String(p.weightedAveragePrice)])),
    );
  }, [data]);

  const parsedDiscount = Number.parseFloat(discount) || 0;

  const rows = useMemo(() => {
    if (!data) return [];
    return data.products.map((p) => {
      const raw = Number.parseFloat(prices[p.productId] ?? "");
      const settled = Number.isFinite(raw) ? raw : p.weightedAveragePrice;
      // Display estimate: exact when the product was billed at one price with no line discounts.
      const delta = settled * p.quantity - p.weightedAveragePrice * p.quantity;
      return { ...p, settled, delta };
    });
  }, [data, prices]);

  const totalDelta = rows.reduce((sum, r) => sum + r.delta, 0);
  const settledTotal = (data?.originalTotal ?? 0) + totalDelta - parsedDiscount;
  const projectedBalance = (data?.ledgerBalance ?? 0) + totalDelta - parsedDiscount;

  const blocked =
    !!data && (data.alreadySettled || data.ledgerClosed || data.entitlementFrozen);
  const invalid =
    rows.some((r) => !Number.isFinite(r.settled) || r.settled < 0) ||
    !Number.isFinite(parsedDiscount) ||
    parsedDiscount < 0;

  const onConfirm = () => {
    if (!data) return;
    settle.mutate(
      {
        batchId: data.batchId,
        body: {
          lines: rows.map((r) => ({ productId: r.productId, settledUnitPrice: r.settled })),
          discountAmount: parsedDiscount,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          toast.success(t("finance.settlement.success"), {
            description: t("finance.settlement.successHint"),
          });
          if (data.farmId) {
            navigate(`/operations/farms/${data.farmId}`);
          } else {
            navigate("/finance/batches");
          }
        },
        onError: (err) => {
          setConfirmOpen(false);
          toast.error(err.message);
        },
      },
    );
  };

  if (preview.isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Icon.spinner className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (preview.isError || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <BackLink label={t("finance.batches.title")} />
        <p className="text-sm text-muted-foreground">{t("finance.batches.empty")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink label={t("finance.batches.title")} />

      <header className="flex flex-wrap items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon.receipt className="size-7" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{t("finance.settlement.title")}</h1>
            {data.alreadySettled ? (
              <Badge variant="success">{t("finance.settlement.settledBadge")}</Badge>
            ) : (
              <Badge variant={data.batchStatus === "closed" ? "secondary" : "default"}>
                {t(`batchStatus.${data.batchStatus}`, { defaultValue: data.batchStatus })}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{t("finance.settlement.subtitle")}</p>
        </div>
      </header>

      {/* Guard banners — the server enforces these; the screen explains them. */}
      {data.alreadySettled ? (
        <GuardBanner>
          {t("finance.settlement.blockedSettled")}
          {data.settledAt
            ? ` — ${t("finance.settlement.blockedSettledAt", { date: formatDate(data.settledAt, lang) })}`
            : null}
        </GuardBanner>
      ) : null}
      {data.ledgerClosed ? <GuardBanner>{t("finance.settlement.blockedLedgerClosed")}</GuardBanner> : null}
      {data.entitlementFrozen ? (
        <GuardBanner>{t("finance.settlement.blockedEntitlementFrozen")}</GuardBanner>
      ) : null}

      {/* Batch terms — what the doctor's deal is while the prices are negotiated. */}
      <Card className="grid gap-x-8 gap-y-2 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Kv label={t("finance.batches.customer")} value={data.customerName} />
        <Kv label={t("finance.batches.farm")} value={data.farmName ?? "—"} />
        <Kv label={t("finance.batches.responsibleDoctor")} value={data.doctorName} />
        <Kv
          label={t("finance.batches.colPeriod")}
          value={<DateRange start={data.startDate} end={data.endDate} className="text-sm" />}
        />
        <Kv label={t("finance.batches.colAnimals")} value={formatNumber(data.animalCount, lang)} />
        <Kv
          label={t("finance.batches.colFee")}
          value={`${t(`feeModel.${data.supervisionFeeModel}`, { defaultValue: data.supervisionFeeModel })} · ${formatNumber(data.supervisionFeeValue, lang)}`}
        />
        <Kv
          label={t("finance.batches.colShare")}
          value={
            data.doctorSharePercent != null
              ? `${formatNumber(data.doctorSharePercent, lang)}%${data.doctorShareCeiling != null ? ` (≤ ${formatNumber(data.doctorShareCeiling, lang)})` : ""}`
              : "—"
          }
        />
        <Kv
          label={t("finance.batches.colStatus")}
          value={t(`entitlementSystem.${data.entitlementSystem}`, {
            defaultValue: data.entitlementSystem ?? "—",
          })}
        />
      </Card>

      {/* The medicines to re-price — one settled price per product, applied to every line. */}
      <Card className="p-5">
        <h2 className="mb-1 font-semibold">{t("finance.settlement.products")}</h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("finance.settlement.voidedExcluded")}</p>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("finance.settlement.noProducts")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("finance.settlement.colProduct")}</TableHead>
                <TableHead>{t("finance.settlement.colQuantity")}</TableHead>
                <TableHead>{t("finance.settlement.colBilledPrice")}</TableHead>
                <TableHead>{t("finance.settlement.colContractPrice")}</TableHead>
                <TableHead className="w-36">{t("finance.settlement.colNewPrice")}</TableHead>
                <TableHead>{t("finance.settlement.colDelta")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.productId}>
                  <TableCell className="font-medium">{r.productName}</TableCell>
                  <TableCell>{formatNumber(r.quantity, lang)}</TableCell>
                  <TableCell>
                    <Money value={r.weightedAveragePrice} />
                    {r.unitPrices.length > 1 ? (
                      <span
                        className="ms-1 text-xs text-muted-foreground"
                        title={r.unitPrices.join(" · ")}
                      >
                        ({t("finance.settlement.multiplePrices")})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {r.contractPrice != null ? <Money value={r.contractPrice} /> : "—"}
                  </TableCell>
                  <TableCell>
                    <Input
                      dir="ltr"
                      inputMode="decimal"
                      value={prices[r.productId] ?? ""}
                      disabled={blocked}
                      onChange={(e) =>
                        setPrices((prev) => ({ ...prev, [r.productId]: e.target.value }))
                      }
                    />
                  </TableCell>
                  <TableCell className={cn(r.delta < 0 && "text-rose-700", r.delta > 0 && "text-emerald-700")}>
                    <Money value={r.delta} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* The cycle's invoices — read-only context for the negotiation. */}
      <Card className="p-5">
        <h2 className="mb-4 font-semibold">{t("finance.settlement.invoices")}</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("finance.settlement.invoiceNumber")}</TableHead>
              <TableHead>{t("finance.settlement.invoiceDate")}</TableHead>
              <TableHead>{t("finance.settlement.invoiceType")}</TableHead>
              <TableHead>{t("finance.settlement.invoiceTotal")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.invoices.map((inv) => (
              <TableRow key={inv.invoiceId}>
                <TableCell dir="ltr">{inv.number ?? "—"}</TableCell>
                <TableCell>
                  <span dir="ltr">{formatDate(inv.issuedAt, lang)}</span>
                </TableCell>
                <TableCell>
                  {t(`invoiceType.${inv.invoiceType}`, { defaultValue: inv.invoiceType })}
                </TableCell>
                <TableCell>
                  <Money value={inv.total} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Discount + notes + the money summary. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="settlement-discount">{t("finance.settlement.discount")}</Label>
            <Input
              id="settlement-discount"
              dir="ltr"
              inputMode="decimal"
              value={discount}
              disabled={blocked}
              onChange={(e) => setDiscount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("finance.settlement.discountHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settlement-notes">{t("finance.settlement.notes")}</Label>
            <Textarea
              id="settlement-notes"
              rows={3}
              value={notes}
              disabled={blocked}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </Card>

        <Card className="space-y-2 p-5">
          <h2 className="font-semibold">{t("finance.settlement.summary")}</h2>
          <SummaryRow label={t("finance.settlement.originalTotal")} value={data.originalTotal} />
          <SummaryRow label={t("finance.settlement.repricingDelta")} value={totalDelta} signed />
          <SummaryRow label={t("finance.settlement.discount")} value={-parsedDiscount} signed />
          <div className="border-t pt-2">
            <SummaryRow label={t("finance.settlement.settledTotal")} value={settledTotal} bold />
          </div>
          <div className="border-t pt-2 space-y-2">
            <SummaryRow label={t("finance.settlement.currentBalance")} value={data.ledgerBalance} />
            <SummaryRow
              label={t("finance.settlement.projectedBalance")}
              value={projectedBalance}
              bold
            />
          </div>
          {projectedBalance < 0 ? (
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              {t("finance.settlement.negativeBalanceWarning")}
            </p>
          ) : null}
          <Button
            className="mt-2 w-full"
            disabled={blocked || invalid || settle.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {settle.isPending ? <Icon.spinner className="size-4 animate-spin" /> : null}
            {t("finance.settlement.confirm")}
          </Button>
        </Card>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("finance.settlement.confirmTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm">{t("finance.settlement.confirmBody")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={onConfirm} disabled={settle.isPending}>
              {settle.isPending ? <Icon.spinner className="size-4 animate-spin" /> : null}
              {t("finance.settlement.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function GuardBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <Icon.warn className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b py-1.5 text-sm last:border-0 sm:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  signed,
}: {
  label: string;
  value: number;
  bold?: boolean;
  signed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Money
        value={value}
        className={cn(
          bold && "font-semibold",
          signed && value < 0 && "text-rose-700",
          signed && value > 0 && "text-emerald-700",
        )}
      />
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      to="/finance/batches"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <Icon.chevronRight className="size-4 ltr:hidden" />
      <Icon.chevronLeft className="size-4 rtl:hidden" />
      {label}
    </Link>
  );
}
