import type { ColumnDef } from "@tanstack/react-table";
import {
  ENTITLEMENT_STATUS_VALUES,
  type ApiError,
  type DoctorEntitlementResponse,
} from "@vet/shared";
import { Money } from "@/components/ui/money";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/form/Field";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { cn } from "@/lib/utils";
import { useApproveEntitlement, useEntitlements, usePayEntitlement } from "@/queries/entitlements";
import { entitlementStatusVariant } from "@/routes/finance/statusVariants";

/** A status summary card (totals computed across all entitlements, not just the filtered page). */
function SummaryCard({
  tone,
  icon,
  label,
  hint,
  amount,
  count,
}: {
  tone: "amber" | "teal" | "green";
  icon: React.ReactNode;
  label: string;
  hint: string;
  amount: number;
  count: number;
}) {
  const bg = tone === "amber" ? "var(--amber-soft)" : tone === "teal" ? "var(--teal-50)" : "var(--green-soft)";
  return (
    <div className="rounded-2xl border p-4" style={{ background: bg }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-lg bg-white/70">{icon}</span>
        <div>
          <div className="text-sm font-semibold text-navy-900">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>
      <div className="text-xl font-bold"><Money value={amount} /></div>
      <div className="text-xs text-muted-foreground">{count}</div>
    </div>
  );
}

export function EntitlementsPage() {
  const { t } = useTranslation();
  const [doctorId, setDoctorId] = useState("");
  const [status, setStatus] = useState("");
  const [payTarget, setPayTarget] = useState<DoctorEntitlementResponse | null>(null);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [doctorId, status, reset]);

  const doctors = useDoctorOptions();
  const all = useEntitlements({ take: 200 }); // unfiltered, for the status summary totals
  const query = useEntitlements({
    doctorId: doctorId || undefined,
    status: status || undefined,
    skip,
    take,
  });
  const rows = query.data ?? [];
  const approve = useApproveEntitlement();

  const summary = useMemo(() => {
    const acc = {
      pending: { amount: 0, count: 0 },
      approved: { amount: 0, count: 0 },
      paid: { amount: 0, count: 0 },
    };
    for (const e of all.data ?? []) {
      const s = (acc as Record<string, { amount: number; count: number }>)[e.status];
      if (s) {
        s.amount += e.computedAmount;
        s.count += 1;
      }
    }
    return acc;
  }, [all.data]);

  const doctorName = (id: string | null | undefined) =>
    (id ? doctors.byId.get(id) : undefined) ?? "—";

  // The settlement lock (invariant #1): approve is rejected until the related customer's ledger is
  // closed. The server returns 409 `settlement_locked`; explain it rather than showing a raw error.
  const onApproveError = (e: ApiError) =>
    toast.error(e.code === "settlement_locked" ? t("finance.entitlements.lockedError") : e.message);

  const doApprove = (e: DoctorEntitlementResponse) =>
    approve.mutate(e.id, {
      onSuccess: () => toast.success(t("admin.common.updated")),
      onError: onApproveError,
    });

  const columns = useMemo<ColumnDef<DoctorEntitlementResponse>[]>(
    () => [
      {
        accessorKey: "doctorId",
        header: t("finance.entitlements.colDoctor"),
        cell: ({ row }) => <span className="font-medium">{doctorName(row.original.doctorId)}</span>,
      },
      {
        id: "source",
        header: t("finance.entitlements.colSource"),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {row.original.batchId
              ? t("finance.entitlements.sourceBatch")
              : t("finance.entitlements.sourceVisit")}
          </Badge>
        ),
      },
      {
        accessorKey: "calculationSystem",
        header: t("finance.entitlements.colSystem"),
        cell: ({ row }) =>
          t(`entitlementSystem.${row.original.calculationSystem}`, {
            defaultValue: row.original.calculationSystem,
          }),
      },
      {
        accessorKey: "computedAmount",
        header: t("finance.entitlements.colAmount"),
        cell: ({ row }) => (
          <span className={cn("font-medium", row.original.computedAmount <= 0 && "text-muted-foreground")}>
            <Money value={row.original.computedAmount} />
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: t("finance.entitlements.colStatus"),
        cell: ({ row }) => (
          <Badge variant={entitlementStatusVariant(row.original.status)}>
            {t(`entitlementStatus.${row.original.status}`, { defaultValue: row.original.status })}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end">
            {row.original.status === "pending" ? (
              <Button size="sm" variant="outline" onClick={() => doApprove(row.original)} disabled={approve.isPending}>
                <Icon.check className="size-4" />
                {t("finance.entitlements.approve")}
              </Button>
            ) : row.original.status === "approved" ? (
              <Button size="sm" onClick={() => setPayTarget(row.original)}>
                <Icon.receipt className="size-4" />
                {t("finance.entitlements.pay")}
              </Button>
            ) : row.original.paidMethod ? (
              <span className="text-xs text-muted-foreground">
                {t(`paymentMethod.${row.original.paidMethod}`, { defaultValue: row.original.paidMethod })}
              </span>
            ) : null}
          </div>
        ),
      },
    ],
    [t, doctors.byId, approve.isPending],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("finance.entitlements.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("finance.entitlements.subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          tone="amber"
          icon={<Icon.clock className="size-5 text-amber" />}
          label={t("finance.entitlements.pending")}
          hint={t("finance.entitlements.pendingHint")}
          amount={summary.pending.amount}
          count={summary.pending.count}
        />
        <SummaryCard
          tone="teal"
          icon={<Icon.check className="size-5 text-primary" />}
          label={t("finance.entitlements.approved")}
          hint={t("finance.entitlements.approvedHint")}
          amount={summary.approved.amount}
          count={summary.approved.count}
        />
        <SummaryCard
          tone="green"
          icon={<Icon.receipt className="size-5 text-success" />}
          label={t("finance.entitlements.paid")}
          hint={t("finance.entitlements.paidHint")}
          amount={summary.paid.amount}
          count={summary.paid.count}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          containerClassName="w-56"
        >
          <option value="">{`${t("finance.entitlements.colDoctor")}: ${t("finance.all")}`}</option>
          {doctors.options.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <span className="flex-1" />
        <button
          type="button"
          className={cn("chip", status === "" && "active")}
          onClick={() => setStatus("")}
        >
          {t("finance.all")}
        </button>
        {ENTITLEMENT_STATUS_VALUES.map((s) => (
          <button
            key={s}
            type="button"
            className={cn("chip", status === s && "active")}
            onClick={() => setStatus(s)}
          >
            {t(`entitlementStatus.${s}`)}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={query.isLoading}
        emptyMessage={t("finance.entitlements.empty")}
      />
      <Pagination
        page={page + 1}
        canPrev={canPrev}
        canNext={rows.length === take}
        onPrev={prev}
        onNext={next}
      />

      <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Icon.shield className="size-4" />
            {t("finance.entitlements.settlementLock")}
          </span>
          <span className="whitespace-nowrap font-medium text-foreground">
            {t("finance.entitlements.approvedTotal")}: <Money value={summary.approved.amount} />
          </span>
        </div>
      </div>

      <PayEntitlementDialog target={payTarget} onClose={() => setPayTarget(null)} />
    </div>
  );
}

function PayEntitlementDialog({
  target,
  onClose,
}: {
  target: DoctorEntitlementResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const pay = usePayEntitlement();
  const [method, setMethod] = useState("cash");

  const submit = () => {
    if (!target) return;
    pay.mutate(
      { id: target.id, body: { method: method as "cash" | "card" | "bank_transfer" | "credit" } },
      {
        onSuccess: () => {
          toast.success(t("admin.common.updated"));
          onClose();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={target !== null} onClose={onClose} title={t("finance.entitlements.payTitle")}>
      <div className="space-y-4">
        {target ? (
          <div className="text-sm text-muted-foreground">
            <Money value={target.computedAmount} />
          </div>
        ) : null}
        <Field label={t("finance.entitlements.payMethod")}>
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">{t("paymentMethod.cash")}</option>
            <option value="card">{t("paymentMethod.card")}</option>
            <option value="bank_transfer">{t("paymentMethod.bank_transfer")}</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={pay.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button onClick={submit} disabled={pay.isPending}>
            {t("finance.entitlements.pay")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
