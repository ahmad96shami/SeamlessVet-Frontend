import { DISPENSE_TYPE_VALUES, type ApiError, type PrescriptionResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useProducts } from "@/queries/products";
import { useCreatePrescription, useUpdatePrescription } from "@/queries/prescriptions";

type DispenseType = "administered_in_clinic" | "dispensed_to_owner";

/**
 * Add / edit a prescription. On create the product, dispense type, and quantity are chosen — an
 * `administered_in_clinic` script deducts inventory server-side. On edit only the advisory text is
 * mutable (product / dispense type / quantity are immutable post-create).
 */
export function PrescriptionFormDialog({
  open,
  visitId,
  prescription,
  onClose,
}: {
  open: boolean;
  visitId: string;
  prescription: PrescriptionResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreatePrescription();
  const update = useUpdatePrescription();
  const products = useProducts({ take: 200 });
  const meds = useMemo(
    () => (products.data ?? []).filter((p) => p.category === "medication"),
    [products.data],
  );

  const isEdit = prescription !== null;
  const [productId, setProductId] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [dispenseType, setDispenseType] = useState<DispenseType>("administered_in_clinic");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (!open) return;
    setProductId(prescription?.productId ?? "");
    setDosage(prescription?.dosage ?? "");
    setFrequency(prescription?.frequency ?? "");
    setDuration(prescription?.duration ?? "");
    setNotes(prescription?.notes ?? "");
    setDispenseType((prescription?.dispenseType as DispenseType) ?? "administered_in_clinic");
    setQuantity(prescription?.quantity != null ? String(prescription.quantity) : "");
  }, [open, prescription]);

  const pending = create.isPending || update.isPending;
  const qtyValid = quantity.trim() !== "" && Number(quantity) > 0;
  const valid = isEdit ? true : productId !== "" && qtyValid;

  const onSubmit = () => {
    if (!valid) return;
    const onError = (e: ApiError) => toast.error(e.message);
    const text = (s: string) => (s.trim() === "" ? undefined : s.trim());
    if (isEdit) {
      update.mutate(
        {
          id: prescription.id,
          body: {
            dosage: text(dosage),
            frequency: text(frequency),
            duration: text(duration),
            notes: text(notes),
          },
        },
        { onSuccess: () => { toast.success(t("admin.common.updated")); onClose(); }, onError },
      );
    } else {
      create.mutate(
        {
          visitId,
          productId,
          dosage: text(dosage),
          frequency: text(frequency),
          duration: text(duration),
          notes: text(notes),
          dispenseType,
          quantity: Number(quantity),
        },
        { onSuccess: () => { toast.success(t("admin.common.created")); onClose(); }, onError },
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? t("visits.prescriptions.editTitle") : t("visits.prescriptions.newTitle")}
      className="max-w-xl"
    >
      <div className="space-y-4">
        <Field label={t("visits.prescriptions.product")}>
          <Select value={productId} disabled={isEdit} onChange={(e) => setProductId(e.target.value)}>
            <option value="">{t("visits.prescriptions.selectProduct")}</option>
            {meds.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameAr}
                {p.unitOfMeasure ? ` · ${p.unitOfMeasure}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("visits.prescriptions.dispenseType")}>
            <Select
              value={dispenseType}
              disabled={isEdit}
              onChange={(e) => setDispenseType(e.target.value as DispenseType)}
            >
              {DISPENSE_TYPE_VALUES.map((d) => (
                <option key={d} value={d}>
                  {t(`dispenseType.${d}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("visits.prescriptions.quantity")}>
            <Input
              type="number"
              step="0.001"
              min="0"
              dir="ltr"
              disabled={isEdit}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label={t("visits.prescriptions.dosage")}>
            <Input value={dosage} onChange={(e) => setDosage(e.target.value)} />
          </Field>
          <Field label={t("visits.prescriptions.frequency")}>
            <Input value={frequency} onChange={(e) => setFrequency(e.target.value)} />
          </Field>
          <Field label={t("visits.prescriptions.duration")}>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
        </div>
        <Field label={t("visits.prescriptions.notes")}>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
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
