import { VACCINE_CATEGORY, type CustomerResponse, type VaccinationResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { usePets } from "@/queries/pets";
import { useProducts } from "@/queries/products";
import { CustomerCombobox } from "@/routes/customers/CustomerCombobox";
import { useCreateVaccination, useUpdateVaccination } from "@/queries/vaccinations";
import { VaccineFormDialog } from "@/routes/vaccinations/VaccineFormDialog";

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Create a vaccination **outside a visit** (W13) or edit an existing one. Create mode picks the
 * recipient: customer live-search → a specific pet, or "the whole group" (a farm-group vaccination,
 * customer-level, no pet). Edit mode keeps the recipient fixed (the backend PATCH can't move it) and
 * only updates the vaccine/dates. `nextDueDate` drives the M18 reminder job + the upcoming calendar.
 * M26: the vaccine is picked from the catalog (a product with category `vaccine`) and the selling
 * price snapshots at recording time; recording deducts stock (FEFO) — with no visit there is nothing
 * to auto-assemble, so sell it from the POS vaccines tab. Editing a legacy free-text record keeps
 * its name unless a vaccine is picked.
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
  const vaccines = useProducts({ category: VACCINE_CATEGORY, take: 200 });
  const editing = vaccination !== null;

  // Recipient (create mode only)
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [petId, setPetId] = useState(""); // "" = the whole group (farm-group)

  // Fields
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [dateGiven, setDateGiven] = useState(todayISO());
  const [nextDueDate, setNextDueDate] = useState("");

  // Inline "add vaccine" — reuses the catalog form; the new id is then auto-selected here.
  const [addVaccineOpen, setAddVaccineOpen] = useState(false);
  const [vaccineDefaultName, setVaccineDefaultName] = useState("");
  const [createdVaccineId, setCreatedVaccineId] = useState<string | null>(null);

  const petsQuery = usePets(customer ? { customerId: customer.id, take: 100 } : { take: 0 });
  const pets = customer ? (petsQuery.data ?? []) : [];

  useEffect(() => {
    if (!open) return;
    setCustomer(null);
    setPetId("");
    setProductId(vaccination?.productId ?? "");
    setPrice(vaccination?.price != null ? String(vaccination.price) : "");
    setDateGiven(vaccination?.dateGiven ?? todayISO());
    setNextDueDate(vaccination?.nextDueDate ?? "");
    setAddVaccineOpen(false);
    setCreatedVaccineId(null);
  }, [open, vaccination]);

  const onPickVaccine = (id: string) => {
    setProductId(id);
    const product = (vaccines.data ?? []).find((p) => p.id === id);
    if (product) setPrice(String(product.sellingPrice));
  };

  // Once the freshly-created vaccine lands in the (invalidated) catalog list, select it —
  // through onPickVaccine so its selling price snapshots like any other pick.
  useEffect(() => {
    if (createdVaccineId && (vaccines.data ?? []).some((p) => p.id === createdVaccineId)) {
      onPickVaccine(createdVaccineId);
      setCreatedVaccineId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdVaccineId, vaccines.data]);

  const vaccineOptions = useMemo(
    () =>
      (vaccines.data ?? []).map((p) => ({
        value: p.id,
        label: p.nameAr,
        keywords: p.nameLatin ?? undefined,
      })),
    [vaccines.data],
  );
  const pickedName = (vaccines.data ?? []).find((p) => p.id === productId)?.nameAr;

  const pending = create.isPending || update.isPending;
  const priceValid = price === "" || (!Number.isNaN(Number(price)) && Number(price) >= 0);
  // Catalog-only: a new record needs a picked vaccine; an edit may keep a legacy free-text name.
  const fieldsValid = dateGiven.trim() !== "" && priceValid && (editing || productId !== "");
  const valid = editing ? fieldsValid : fieldsValid && customer !== null;

  const onSubmit = () => {
    if (!valid) return;
    const due = nextDueDate.trim() === "" ? undefined : nextDueDate;
    const priceNum = price.trim() === "" ? undefined : Number(price);

    if (vaccination) {
      update.mutate(
        {
          id: vaccination.id,
          body: {
            // The product link is immutable once recorded (stock moved) — only re-snapshot the
            // name/price when a catalog vaccine is picked (legacy rows keep their free-text name).
            productId: productId || undefined,
            vaccineType: pickedName ?? undefined,
            price: priceNum,
            dateGiven,
            nextDueDate: due,
          },
        },
        { onSuccess: () => { toast.success(t("admin.common.updated")); onClose(); } },
      );
    } else if (customer) {
      create.mutate(
        {
          // recipient: a specific pet, else the customer (farm group). No visit — standalone.
          petId: petId || undefined,
          customerId: petId ? undefined : customer.id,
          productId,
          vaccineType: pickedName ?? "",
          price: priceNum, // omitted → the server snapshots the catalog selling price
          dateGiven,
          nextDueDate: due,
        },
        { onSuccess: () => { toast.success(t("admin.common.created")); onClose(); } },
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
        <Field label={t("vaccinations.form.vaccine")}>
          <Combobox
            value={productId}
            onChange={onPickVaccine}
            options={vaccineOptions}
            placeholder={
              editing && !productId && vaccination
                ? vaccination.vaccineType
                : t("vaccinations.form.selectVaccine")
            }
            onCreateNew={(term) => {
              setVaccineDefaultName(term);
              setAddVaccineOpen(true);
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("vaccinations.form.price")}>
            <Input
              type="number"
              step="0.01"
              min="0"
              dir="ltr"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
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
