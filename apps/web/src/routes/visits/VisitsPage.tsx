import type { ColumnDef } from "@tanstack/react-table";
import {
  formatDateTime,
  VISIT_STATUS_VALUES,
  type VisitResponse,
} from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { DataTable } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/data-table/Pagination";
import { AdminPage } from "@/components/layout/AdminPage";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { useOffsetPager } from "@/hooks/useOffsetPager";
import { useCustomers } from "@/queries/customers";
import { useFieldInventories } from "@/queries/inventory";
import { usePets } from "@/queries/pets";
import { useVisits } from "@/queries/visits";
import { VisitFormDialog } from "@/routes/visits/VisitFormDialog";

/** Badge tone per visit status — reused by the detail shell. */
export function visitStatusVariant(status: string): BadgeProps["variant"] {
  if (status === "in_progress") return "warning";
  if (status === "completed") return "success";
  if (status === "cancelled") return "secondary";
  return "default"; // open
}

/** A short visit reference: the human visit number, or a truncated id when none was assigned. */
export function visitRef(v: Pick<VisitResponse, "visitNumber" | "id">): string {
  return v.visitNumber ?? `#${v.id.slice(0, 8)}`;
}

export function VisitsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const navigate = useNavigate();

  const [status, setStatus] = useState("");
  const [doctor, setDoctor] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const { page, skip, take, canPrev, next, prev, reset } = useOffsetPager(20);

  useEffect(() => reset(), [status, doctor, reset]);

  const query = useVisits({
    status: status || undefined,
    doctorId: doctor || undefined,
    skip,
    take,
  });
  const rows = query.data ?? [];

  // Client-side reference joins (W2 precedent): resolve customer / pet / doctor ids to names from a
  // capped page of each reference list. Cached + slow-changing.
  const fieldInvs = useFieldInventories();
  const customers = useCustomers({ take: 200 });
  const pets = usePets({ take: 200 });

  const customerById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers.data ?? []) m.set(c.id, c.fullName);
    return m;
  }, [customers.data]);
  const petById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pets.data ?? []) m.set(p.id, p.name);
    return m;
  }, [pets.data]);
  const doctorById = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of fieldInvs.data ?? []) m.set(f.doctorId, f.doctorName);
    return m;
  }, [fieldInvs.data]);

  const columns = useMemo<ColumnDef<VisitResponse>[]>(
    () => [
      {
        id: "number",
        header: t("visits.col.number"),
        cell: ({ row }) => (
          <span className="font-mono text-xs" dir="ltr">
            {visitRef(row.original)}
          </span>
        ),
      },
      {
        id: "pet",
        header: t("visits.col.pet"),
        cell: ({ row }) => {
          const id = row.original.petId;
          if (!id) return <span className="text-muted-foreground">{t("visits.noPet")}</span>;
          return petById.get(id) ?? <span className="text-muted-foreground">—</span>;
        },
      },
      {
        id: "customer",
        header: t("visits.col.customer"),
        cell: ({ row }) => (
          <span className="font-medium">
            {customerById.get(row.original.customerId) ?? "—"}
          </span>
        ),
      },
      {
        id: "doctor",
        header: t("visits.col.doctor"),
        cell: ({ row }) =>
          doctorById.get(row.original.doctorId) ?? (
            <span className="text-muted-foreground">{t("visits.unknownDoctor")}</span>
          ),
      },
      {
        accessorKey: "visitType",
        header: t("visits.col.type"),
        cell: ({ row }) => (
          <Badge variant="secondary">
            {t(`visitType.${row.original.visitType}`, { defaultValue: row.original.visitType })}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: t("visits.col.status"),
        cell: ({ row }) => (
          <Badge variant={visitStatusVariant(row.original.status)}>
            {t(`visitStatus.${row.original.status}`, { defaultValue: row.original.status })}
          </Badge>
        ),
      },
      {
        accessorKey: "startedAt",
        header: t("visits.col.started"),
        cell: ({ row }) =>
          row.original.startedAt ? (
            <span dir="ltr">{formatDateTime(row.original.startedAt, lang)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [t, lang, customerById, petById, doctorById],
  );

  return (
    <AdminPage
      title={t("visits.title")}
      description={t("visits.description")}
      actions={
        <Button onClick={() => setFormOpen(true)}>
          <Icon.plus className="size-4" />
          {t("visits.new")}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} containerClassName="w-48">
            <option value="">{`${t("visits.filterStatus")}: ${t("visits.allStatuses")}`}</option>
            {VISIT_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {t(`visitStatus.${s}`)}
              </option>
            ))}
          </Select>
          <Select value={doctor} onChange={(e) => setDoctor(e.target.value)} containerClassName="w-52">
            <option value="">{`${t("visits.filterDoctor")}: ${t("visits.allDoctors")}`}</option>
            {(fieldInvs.data ?? []).map((d) => (
              <option key={d.doctorId} value={d.doctorId}>
                {d.doctorName}
              </option>
            ))}
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={query.isLoading}
          emptyMessage={t("visits.empty")}
          onRowClick={(v) => navigate(`/operations/visits/${v.id}`)}
        />
        <Pagination
          page={page + 1}
          canPrev={canPrev}
          canNext={rows.length === take}
          onPrev={prev}
          onNext={next}
        />
      </div>

      {formOpen ? <VisitFormDialog open onClose={() => setFormOpen(false)} /> : null}
    </AdminPage>
  );
}
