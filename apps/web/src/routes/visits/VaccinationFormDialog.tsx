import { type ApiError, type VaccinationResponse, type VisitResponse } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateVaccination, useUpdateVaccination } from "@/queries/vaccinations";

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Add / edit a vaccination on the visit. The recipient is the visit's pet when it has one, else the
 * customer (farm group). `nextDueDate` (optional) drives the M11 reminder job.
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

  const [vaccineType, setVaccineType] = useState("");
  const [dateGiven, setDateGiven] = useState(todayISO());
  const [nextDueDate, setNextDueDate] = useState("");

  useEffect(() => {
    if (!open) return;
    setVaccineType(vaccination?.vaccineType ?? "");
    setDateGiven(vaccination?.dateGiven ?? todayISO());
    setNextDueDate(vaccination?.nextDueDate ?? "");
  }, [open, vaccination]);

  const pending = create.isPending || update.isPending;
  const valid = vaccineType.trim() !== "" && dateGiven.trim() !== "";

  const onSubmit = () => {
    if (!valid) return;
    const onError = (e: ApiError) => toast.error(e.message);
    const due = nextDueDate.trim() === "" ? undefined : nextDueDate;
    if (vaccination) {
      update.mutate(
        { id: vaccination.id, body: { vaccineType: vaccineType.trim(), dateGiven, nextDueDate: due } },
        { onSuccess: () => { toast.success(t("admin.common.updated")); onClose(); }, onError },
      );
    } else {
      create.mutate(
        {
          // recipient: the visit's pet, else the customer (farm group)
          petId: visit.petId ?? undefined,
          customerId: visit.petId ? undefined : visit.customerId,
          visitId: visit.id,
          vaccineType: vaccineType.trim(),
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
        <Field label={t("visits.vaccinations.vaccineType")}>
          <Input autoFocus value={vaccineType} onChange={(e) => setVaccineType(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("visits.vaccinations.dateGiven")}>
            <Input type="date" dir="ltr" value={dateGiven} onChange={(e) => setDateGiven(e.target.value)} />
          </Field>
          <Field label={t("visits.vaccinations.nextDueDate")}>
            <Input type="date" dir="ltr" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
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
    </Dialog>
  );
}
