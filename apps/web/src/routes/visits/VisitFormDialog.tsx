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
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CustomerCombobox } from "@/routes/customers/CustomerCombobox";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { usePets } from "@/queries/pets";
import { useCreateVisit } from "@/queries/visits";
import { useAuthStore } from "@/stores/authStore";

const VET_ROLES = ["vet_clinic", "vet_field", "vet_both"];

/**
 * Open a new visit: pick a customer (live search), then an optional pet, the doctor, and the visit
 * type. The doctor list is every active vet (GET /doctors); when the signed-in user is a vet their
 * own id is pre-selected. `visit_number` is left server-side null (the web has no per-user prefix
 * source). On success → the visit detail.
 */
export function VisitFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const isVet = !!me && VET_ROLES.includes(me.role);

  const create = useCreateVisit();
  const { options: doctorOptions } = useDoctorOptions();

  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [petId, setPetId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [visitType, setVisitType] = useState<"in_clinic" | "field">("in_clinic");
  const [chiefComplaint, setChiefComplaint] = useState("");

  // The chosen customer's pets (the visit's pet must belong to it).
  const petsQuery = usePets(customer ? { customerId: customer.id, take: 100 } : { take: 0 });
  const pets = customer ? (petsQuery.data ?? []) : [];

  useEffect(() => {
    if (!open) return;
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
        {/* Step 1 — customer (server-searched combobox; "add new" creates + auto-selects) */}
        <Field label={t("visits.create.customer")}>
          <CustomerCombobox
            value={customer}
            onChange={(c) => {
              setCustomer(c);
              setPetId("");
            }}
          />
        </Field>

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
                {doctorOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
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
