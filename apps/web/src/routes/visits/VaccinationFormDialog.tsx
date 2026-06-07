import { VACCINE_CATEGORY, type ApiError, type VaccinationResponse, type VisitResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useServices } from "@/queries/services";
import { useCreateVaccination, useUpdateVaccination } from "@/queries/vaccinations";
import { VaccineFormDialog } from "@/routes/vaccinations/VaccineFormDialog";

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Add / edit a vaccination on the visit. The recipient is the visit's pet when it has one, else the
 * customer (farm group). `nextDueDate` (optional) drives the M11 reminder job. M22: the vaccine is
 * picked from the catalog (a service with category `vaccination`) and its price snapshots like a
 * procedure's — that makes the vaccination billable at issuance. Editing a legacy free-text record
 * keeps its name unless a catalog vaccine is picked.
 */
export function VaccinationFormDialog({
  open,
  visit,
  vaccination,
  onClose,
}: {
  open: boolean;
  visit: VisitResponse;
  vaccination: VaccinationResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateVaccination();
  const update = useUpdateVaccination();
  const vaccines = useServices({ category: VACCINE_CATEGORY, take: 200 });

  const [serviceId, setServiceId] = useState("");
  const [price, setPrice] = useState("");
  const [dateGiven, setDateGiven] = useState(todayISO());
  const [nextDueDate, setNextDueDate] = useState("");

  // Inline "add vaccine" — reuses the catalog form; the new id is then auto-selected here.
  const [addVaccineOpen, setAddVaccineOpen] = useState(false);
  const [vaccineDefaultName, setVaccineDefaultName] = useState("");
  const [createdVaccineId, setCreatedVaccineId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setServiceId(vaccination?.serviceId ?? "");
    setPrice(vaccination?.price != null ? String(vaccination.price) : "");
    setDateGiven(vaccination?.dateGiven ?? todayISO());
    setNextDueDate(vaccination?.nextDueDate ?? "");
    setAddVaccineOpen(false);
    setCreatedVaccineId(null);
  }, [open, vaccination]);

  const onPickVaccine = (id: string) => {
    setServiceId(id);
    const svc = (vaccines.data ?? []).find((s) => s.id === id);
    if (svc) setPrice(String(svc.defaultPrice));
  };

  // Once the freshly-created vaccine lands in the (invalidated) catalog list, select it —
  // through onPickVaccine so its default price snapshots like any other pick.
  useEffect(() => {
    if (createdVaccineId && (vaccines.data ?? []).some((s) => s.id === createdVaccineId)) {
      onPickVaccine(createdVaccineId);
      setCreatedVaccineId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdVaccineId, vaccines.data]);

  const vaccineOptions = useMemo(
    () =>
      (vaccines.data ?? []).map((s) => ({
        value: s.id,
        label: s.nameAr,
        keywords: s.nameLatin ?? undefined,
      })),
    [vaccines.data],
  );
  const pickedName = (vaccines.data ?? []).find((s) => s.id === serviceId)?.nameAr;

  const editing = vaccination !== null;
  const pending = create.isPending || update.isPending;
  const priceValid = price === "" || (!Number.isNaN(Number(price)) && Number(price) >= 0);
  // Catalog-only: a new record needs a picked vaccine; an edit may keep a legacy free-text name.
  const valid = dateGiven.trim() !== "" && priceValid && (editing || serviceId !== "");

  const onSubmit = () => {
    if (!valid) return;
    const onError = (e: ApiError) => toast.error(e.message);
    const due = nextDueDate.trim() === "" ? undefined : nextDueDate;
    const priceNum = price.trim() === "" ? undefined : Number(price);

    if (vaccination) {
      update.mutate(
        {
          id: vaccination.id,
          body: {
            // Only re-link / re-snapshot when a catalog vaccine is picked (legacy rows keep their name).
            serviceId: serviceId || undefined,
            vaccineType: pickedName ?? undefined,
            price: priceNum,
            dateGiven,
            nextDueDate: due,
          },
        },
        { onSuccess: () => { toast.success(t("admin.common.updated")); onClose(); }, onError },
      );
    } else {
      create.mutate(
        {
          // recipient: the visit's pet, else the customer (farm group)
          petId: visit.petId ?? undefined,
          customerId: visit.petId ? undefined : visit.customerId,
          visitId: visit.id,
          serviceId,
          vaccineType: pickedName ?? "",
          price: priceNum, // omitted → the server snapshots the catalog price
          dateGiven,
          nextDueDate: due,
        },
        { onSuccess: () => { toast.success(t("admin.common.created")); onClose(); }, onError },
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={vaccination ? t("visits.vaccinations.editTitle") : t("visits.vaccinations.newTitle")}
    >
      <div className="space-y-4">
        <Field label={t("visits.vaccinations.vaccine")}>
          <Combobox
            value={serviceId}
            onChange={onPickVaccine}
            options={vaccineOptions}
            placeholder={
              editing && !serviceId && vaccination
                ? vaccination.vaccineType
                : t("visits.vaccinations.selectVaccine")
            }
            onCreateNew={(term) => {
              setVaccineDefaultName(term);
              setAddVaccineOpen(true);
            }}
          />
        </Field>
        <Field label={t("visits.vaccinations.price")}>
          <Input
            type="number"
            step="0.01"
            min="0"
            dir="ltr"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("visits.vaccinations.dateGiven")}>
            <DatePicker value={dateGiven} onChange={(e) => setDateGiven(e.target.value)} />
          </Field>
          <Field label={t("visits.vaccinations.nextDueDate")}>
            <DatePicker value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t("admin.common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={!valid || pending}>
            {pending ? t("admin.common.saving") : t("admin.common.save")}
          </Button>
        </div>
      </div>

      <VaccineFormDialog
        open={addVaccineOpen}
        vaccine={null}
        defaultName={vaccineDefaultName}
        onClose={() => setAddVaccineOpen(false)}
        onCreated={(id) => setCreatedVaccineId(id)}
      />
    </Dialog>
  );
}
