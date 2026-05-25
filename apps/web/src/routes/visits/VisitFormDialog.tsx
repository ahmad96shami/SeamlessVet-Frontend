import {
  VISIT_TYPE_VALUES,
  type ApiError,
  type CustomerResponse,
} from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCustomers } from "@/queries/customers";
import { useFieldInventories } from "@/queries/inventory";
import { usePets } from "@/queries/pets";
import { useCreateVisit } from "@/queries/visits";
import { useAuthStore } from "@/stores/authStore";

const VET_ROLES = ["vet_clinic", "vet_field", "vet_both"];

/**
 * Open a new visit: pick a customer (live search), then an optional pet, the doctor, and the visit
 * type. The doctor list is the authenticated field-inventories source; when the signed-in user is a
 * vet they're offered as "me" (and pre-selected) even if they have no field inventory. `visit_number`
 * is left server-side null (the web has no per-user prefix source). On success → the visit detail.
 */
export function VisitFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const isVet = !!me && VET_ROLES.includes(me.role);

  const create = useCreateVisit();
  const fieldInvs = useFieldInventories();
  const fieldDocs = fieldInvs.data ?? [];
  const offerMe = isVet && !!me && !fieldDocs.some((d) => d.doctorId === me.userId);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [petId, setPetId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [visitType, setVisitType] = useState<"in_clinic" | "field">("in_clinic");
  const [chiefComplaint, setChiefComplaint] = useState("");

  // Candidates for the customer picker (only queried while choosing).
  const customersQuery = useCustomers({ search: debouncedSearch || undefined, take: 20 });
  const candidates = customersQuery.data ?? [];
  // The chosen customer's pets (the visit's pet must belong to it).
  const petsQuery = usePets(customer ? { customerId: customer.id, take: 100 } : { take: 0 });
  const pets = customer ? (petsQuery.data ?? []) : [];

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setCustomer(null);
    setPetId("");
    setDoctorId(isVet && me ? me.userId : "");
    setVisitType("in_clinic");
    setChiefComplaint("");
  }, [open, isVet, me]);

  const onConfirm = () => {
    if (!customer || !doctorId) return;
    create.mutate(
      {
        visitType,
        customerId: customer.id,
        petId: petId || undefined,
        doctorId,
        chiefComplaint: chiefComplaint.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          onClose();
          if (res.queued) {
            // Offline: the visit is queued + shown optimistically in the list; its detail can't load
            // until it reaches the server, so stay on the list rather than navigate into a blank page.
            toast.success(t("visits.create.queued"));
          } else {
            toast.success(t("visits.create.created"));
            navigate(`/operations/visits/${res.id}`);
          }
        },
        onError: (e: ApiError) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("visits.newTitle")} className="max-w-xl">
      <div className="space-y-4">
        {/* Step 1 — customer */}
        {customer ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border bg-[var(--paper-soft)] p-3">
            <span className="min-w-0">
              <span className="text-xs text-muted-foreground">{t("visits.create.customer")}</span>
              <span className="block truncate font-medium">{customer.fullName}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setCustomer(null)}>
              {t("admin.common.edit")}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder={t("visits.create.searchCustomer")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-56 divide-y overflow-auto rounded-xl border">
              {candidates.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">{t("customers.empty")}</div>
              ) : (
                candidates.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      setCustomer(c);
                      setPetId("");
                    }}
                    className="flex w-full items-center justify-between gap-2 p-3 text-start text-sm transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{c.fullName}</span>
                      {c.phonePrimary ? (
                        <span className="ms-2 text-xs text-muted-foreground" dir="ltr">
                          {c.phonePrimary}
                        </span>
                      ) : null}
                    </span>
                    <Badge variant="secondary">
                      {t(`customerType.${c.type}`, { defaultValue: c.type })}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2 — visit details (revealed once a customer is chosen) */}
        {customer ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("visits.create.pet")}>
              <Select value={petId} onChange={(e) => setPetId(e.target.value)}>
                <option value="">{t("visits.create.noPet")}</option>
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.species ? ` · ${p.species}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("visits.create.doctor")}>
              <Select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                <option value="">{t("visits.create.selectDoctor")}</option>
                {offerMe && me ? (
                  <option value={me.userId}>{t("visits.create.currentUser")}</option>
                ) : null}
                {fieldDocs.map((d) => (
                  <option key={d.doctorId} value={d.doctorId}>
                    {d.doctorName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("visits.create.visitType")}>
              <Select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as "in_clinic" | "field")}
              >
                {VISIT_TYPE_VALUES.map((vt) => (
                  <option key={vt} value={vt}>
                    {t(`visitType.${vt}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={t("visits.create.chiefComplaint")}>
                <Textarea
                  rows={2}
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                />
              </Field>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={!customer || !doctorId || create.isPending}>
            {create.isPending ? t("admin.common.saving") : t("visits.new")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
