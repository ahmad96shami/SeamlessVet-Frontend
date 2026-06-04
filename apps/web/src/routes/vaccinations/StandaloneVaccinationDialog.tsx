import { type ApiError, type CustomerResponse, type VaccinationResponse } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { usePets } from "@/queries/pets";
import { CustomerCombobox } from "@/routes/customers/CustomerCombobox";
import { useCreateVaccination, useUpdateVaccination } from "@/queries/vaccinations";

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Create a vaccination **outside a visit** (W13) or edit an existing one. Create mode picks the
 * recipient: customer live-search → a specific pet, or "the whole group" (a farm-group vaccination,
 * customer-level, no pet). Edit mode keeps the recipient fixed (the backend PATCH can't move it) and
 * only updates the vaccine/dates. `nextDueDate` drives the M18 reminder job + the upcoming calendar.
 */
export function StandaloneVaccinationDialog({
  open,
  vaccination,
  recipientLabel,
  onClose,
}: {
  open: boolean;
  vaccination: VaccinationResponse | null;
  recipientLabel?: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateVaccination();
  const update = useUpdateVaccination();
  const editing = vaccination !== null;

  // Recipient (create mode only)
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [petId, setPetId] = useState(""); // "" = the whole group (farm-group)

  // Fields
  const [vaccineType, setVaccineType] = useState("");
  const [dateGiven, setDateGiven] = useState(todayISO());
  const [nextDueDate, setNextDueDate] = useState("");

  const petsQuery = usePets(customer ? { customerId: customer.id, take: 100 } : { take: 0 });
  const pets = customer ? (petsQuery.data ?? []) : [];

  useEffect(() => {
    if (!open) return;
    setCustomer(null);
    setPetId("");
    setVaccineType(vaccination?.vaccineType ?? "");
    setDateGiven(vaccination?.dateGiven ?? todayISO());
    setNextDueDate(vaccination?.nextDueDate ?? "");
  }, [open, vaccination]);

  const pending = create.isPending || update.isPending;
  const fieldsValid = vaccineType.trim() !== "" && dateGiven.trim() !== "";
  const valid = editing ? fieldsValid : fieldsValid && customer !== null;

  const onSubmit = () => {
    if (!valid) return;
    const onError = (e: ApiError) => toast.error(e.message);
    const due = nextDueDate.trim() === "" ? undefined : nextDueDate;

    if (vaccination) {
      update.mutate(
        { id: vaccination.id, body: { vaccineType: vaccineType.trim(), dateGiven, nextDueDate: due } },
        { onSuccess: () => { toast.success(t("admin.common.updated")); onClose(); }, onError },
      );
    } else if (customer) {
      create.mutate(
        {
          // recipient: a specific pet, else the customer (farm group). No visit — standalone.
          petId: petId || undefined,
          customerId: petId ? undefined : customer.id,
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
      title={editing ? t("vaccinations.editTitle") : t("vaccinations.newTitle")}
      className="max-w-xl"
    >
      <div className="space-y-4">
        {/* Recipient */}
        {editing ? (
          <div className="rounded-xl border bg-[var(--paper-soft)] p-3">
            <span className="text-xs text-muted-foreground">{t("vaccinations.form.recipient")}</span>
            <span className="block truncate font-medium">
              {recipientLabel ?? t("vaccinations.recipientUnknown")}
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label={t("vaccinations.form.selectCustomer")}>
              <CustomerCombobox
                value={customer}
                onChange={(c) => {
                  setCustomer(c);
                  setPetId("");
                }}
                placeholder={t("vaccinations.form.searchCustomer")}
              />
            </Field>
            {customer ? (
              <Field label={t("vaccinations.form.pet")}>
                <Select value={petId} onChange={(e) => setPetId(e.target.value)}>
                  <option value="">{t("vaccinations.form.wholeGroup")}</option>
                  {pets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.species ? ` · ${p.species}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>
        )}

        {/* Fields */}
        <Field label={t("vaccinations.form.vaccineType")}>
          <Input value={vaccineType} onChange={(e) => setVaccineType(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("vaccinations.form.dateGiven")}>
            <DatePicker value={dateGiven} onChange={(e) => setDateGiven(e.target.value)} />
          </Field>
          <Field label={t("vaccinations.form.nextDueDate")}>
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
    </Dialog>
  );
}
