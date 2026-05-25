import { type ApiError, type ProcedureResponse } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProcedure, useUpdateProcedure } from "@/queries/procedures";
import { useServices } from "@/queries/services";

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

  useEffect(() => {
    if (!open) return;
    setServiceId(procedure?.serviceId ?? "");
    setPrice(procedure ? String(procedure.price) : "");
    setResultText(procedure?.resultText ?? "");
  }, [open, procedure]);

  const onPickService = (id: string) => {
    setServiceId(id);
    const svc = (services.data ?? []).find((s) => s.id === id);
    if (svc) setPrice(String(svc.defaultPrice));
  };

  const pending = create.isPending || update.isPending;
  const valid = resultText.trim().length > 0 && (price === "" || !Number.isNaN(Number(price)));

  const onSubmit = () => {
    if (!valid) return;
    const onError = (e: ApiError) => toast.error(e.message);
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
        { onSuccess: () => { toast.success(t("admin.common.updated")); onClose(); }, onError },
      );
    } else {
      create.mutate(
        {
          visitId,
          serviceId: serviceId || undefined,
          price: price.trim() === "" ? undefined : Number(price),
          resultText: resultText.trim(),
        },
        { onSuccess: () => { toast.success(t("admin.common.created")); onClose(); }, onError },
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
          <Select value={serviceId} onChange={(e) => onPickService(e.target.value)}>
            <option value="">{t("visits.procedures.noService")}</option>
            {(services.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameAr}
              </option>
            ))}
          </Select>
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
    </Dialog>
  );
}
