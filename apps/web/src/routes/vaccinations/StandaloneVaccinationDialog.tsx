import { type ApiError, type CustomerResponse, type VaccinationResponse } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCustomers } from "@/queries/customers";
import { usePets } from "@/queries/pets";
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
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [petId, setPetId] = useState(""); // "" = the whole group (farm-group)

  // Fields
  const [vaccineType, setVaccineType] = useState("");
  const [dateGiven, setDateGiven] = useState(todayISO());
  const [nextDueDate, setNextDueDate] = useState("");

  const candidatesQuery = useCustomers({ search: debounced || undefined, take: 20 });
  const candidates = candidatesQuery.data ?? [];
  const petsQuery = usePets(customer ? { customerId: customer.id, take: 100 } : { take: 0 });
  const pets = customer ? (petsQuery.data ?? []) : [];

  useEffect(() => {
    if (!open) return;
    setSearch("");
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
        ) : customer ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-xl border bg-[var(--paper-soft)] p-3">
              <span className="min-w-0">
                <span className="text-xs text-muted-foreground">{t("vaccinations.form.recipient")}</span>
                <span className="block truncate font-medium">{customer.fullName}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => { setCustomer(null); setPetId(""); }}>
                {t("vaccinations.form.change")}
              </Button>
            </div>
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
          </div>
        ) : (
          <div className="space-y-2">
            <Field label={t("vaccinations.form.selectCustomer")}>
              <Input
                autoFocus
                placeholder={t("vaccinations.form.searchCustomer")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Field>
            <div className="max-h-56 divide-y overflow-auto rounded-xl border">
              {candidates.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">{t("customers.empty")}</div>
              ) : (
                candidates.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => { setCustomer(c); setPetId(""); }}
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
