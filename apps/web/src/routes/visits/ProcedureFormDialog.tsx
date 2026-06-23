import { type ProcedureResponse } from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProcedure, useUpdateProcedure } from "@/queries/procedures";
import { useServices } from "@/queries/services";
import { ServiceFormDialog } from "@/routes/admin/ServiceFormDialog";

/** Add / edit a procedure on a visit. Linked to a catalog service; price snapshots the service's. */
export function ProcedureFormDialog({
  open,
  visitId,
  procedure,
  onClose,
}: {
  open: boolean;
  visitId: string;
  procedure: ProcedureResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateProcedure();
  const update = useUpdateProcedure();
  const services = useServices({ take: 200 });

  const [serviceId, setServiceId] = useState("");
  const [price, setPrice] = useState("");
  const [resultText, setResultText] = useState("");

  // Inline "add service" — reuses the catalog form; the new id is then auto-selected here.
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [serviceDefaultName, setServiceDefaultName] = useState("");
  const [createdServiceId, setCreatedServiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setServiceId(procedure?.serviceId ?? "");
    setPrice(procedure ? String(procedure.price) : "");
    setResultText(procedure?.resultText ?? "");
    setAddServiceOpen(false);
    setCreatedServiceId(null);
  }, [open, procedure]);

  const onPickService = (id: string) => {
    setServiceId(id);
    const svc = (services.data ?? []).find((s) => s.id === id);
    if (svc) setPrice(String(svc.defaultPrice));
  };

  // Once the freshly-created service lands in the (invalidated) catalog list, select it —
  // through onPickService so its default price snapshots like any other pick.
  useEffect(() => {
    if (createdServiceId && (services.data ?? []).some((s) => s.id === createdServiceId)) {
      onPickService(createdServiceId);
      setCreatedServiceId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdServiceId, services.data]);

  const serviceOptions = useMemo(
    () => [
      { value: "", label: t("visits.procedures.noService") },
      ...(services.data ?? []).map((s) => ({
        value: s.id,
        label: s.nameAr,
        sublabel: s.category ?? undefined,
        keywords: s.nameLatin ?? undefined,
      })),
    ],
    [services.data, t],
  );

  const pending = create.isPending || update.isPending;
  const valid = resultText.trim().length > 0 && (price === "" || !Number.isNaN(Number(price)));

  const onSubmit = () => {
    if (!valid) return;
    if (procedure) {
      update.mutate(
        {
          id: procedure.id,
          body: {
            serviceId: serviceId || undefined,
            price: price.trim() === "" ? undefined : Number(price),
            resultText: resultText.trim(),
          },
        },
        { onSuccess: () => { toast.success(t("admin.common.updated")); onClose(); } },
      );
    } else {
      create.mutate(
        {
          visitId,
          serviceId: serviceId || undefined,
          price: price.trim() === "" ? undefined : Number(price),
          resultText: resultText.trim(),
        },
        { onSuccess: () => { toast.success(t("admin.common.created")); onClose(); } },
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={procedure ? t("visits.procedures.editTitle") : t("visits.procedures.newTitle")}
    >
      <div className="space-y-4">
        <Field label={t("visits.procedures.service")}>
          <Combobox
            value={serviceId}
            onChange={onPickService}
            options={serviceOptions}
            placeholder={t("visits.procedures.noService")}
            onCreateNew={(term) => {
              setServiceDefaultName(term);
              setAddServiceOpen(true);
            }}
          />
        </Field>
        <Field label={t("visits.procedures.price")}>
          <Input
            type="number"
            step="0.01"
            min="0"
            dir="ltr"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Field label={t("visits.procedures.result")}>
          <Textarea
            rows={3}
            placeholder={t("visits.procedures.resultPlaceholder")}
            value={resultText}
            onChange={(e) => setResultText(e.target.value)}
          />
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

      <ServiceFormDialog
        open={addServiceOpen}
        service={null}
        defaultName={serviceDefaultName}
        onClose={() => setAddServiceOpen(false)}
        onCreated={(id) => setCreatedServiceId(id)}
      />
    </Dialog>
  );
}
