import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import {
  useAttachContractFarm,
  useContractFarms,
  useDetachContractFarm,
} from "@/queries/contracts";
import { useFarms } from "@/queries/farms";

/**
 * The farms a contract covers (M15 contract↔farm coverage). A contract spans 1+ farms of its owning
 * customer. Attach/detach are allowed only while the parent contract is `draft` (the backend rejects
 * writes once active). The picker lists the customer's not-yet-attached farms.
 */
export function ContractFarms({
  contractId,
  customerId,
  isDraft,
}: {
  contractId: string;
  customerId: string;
  isDraft: boolean;
}) {
  const { t } = useTranslation();
  const list = useContractFarms(contractId);
  const farms = useFarms({ customerId, take: 200 });
  const detach = useDetachContractFarm(contractId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const farmName = useMemo(
    () => new Map((farms.data ?? []).map((f) => [f.id, f.name] as const)),
    [farms.data],
  );
  const attached = list.data ?? [];
  const attachedIds = useMemo(() => new Set(attached.map((cf) => cf.farmId)), [attached]);
  const available = (farms.data ?? []).filter((f) => !attachedIds.has(f.id));

  const confirmRemove = () => {
    if (!removeTarget) return;
    detach.mutate(removeTarget, {
      onSuccess: () => {
        toast.success(t("admin.common.deleted"));
        setRemoveTarget(null);
      },
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">{t("finance.contractFarms.title")}</h4>
          <p className="text-xs text-muted-foreground">
            {isDraft ? t("finance.contractFarms.subtitle") : t("finance.contractFarms.draftOnly")}
          </p>
        </div>
        {isDraft ? (
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Icon.plus className="size-4" />
            {t("finance.contractFarms.add")}
          </Button>
        ) : null}
      </div>

      {attached.length === 0 ? (
        <p className="rounded-xl border border-dashed p-3 text-center text-sm text-muted-foreground">
          {t("finance.contractFarms.empty")}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {attached.map((cf) => (
            <li key={cf.id} className="flex items-center justify-between gap-2 p-2.5 text-sm">
              <span className="min-w-0 truncate font-medium">
                {farmName.get(cf.farmId) ?? cf.farmId}
              </span>
              {isDraft ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("admin.common.delete")}
                  onClick={() => setRemoveTarget(cf.farmId)}
                >
                  <Icon.trash className="size-4 text-destructive" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AddFarmDialog
        open={dialogOpen}
        contractId={contractId}
        available={available.map((f) => ({ id: f.id, name: f.name }))}
        hasNoFarms={(farms.data ?? []).length === 0}
        onClose={() => setDialogOpen(false)}
      />

      <Dialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("finance.contractFarms.removeConfirm")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={detach.isPending}>
              {t("admin.common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmRemove} disabled={detach.isPending}>
              {t("admin.common.delete")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function AddFarmDialog({
  open,
  contractId,
  available,
  hasNoFarms,
  onClose,
}: {
  open: boolean;
  contractId: string;
  available: { id: string; name: string }[];
  hasNoFarms: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const attach = useAttachContractFarm(contractId);
  const [farmId, setFarmId] = useState("");

  useEffect(() => {
    if (open) setFarmId("");
  }, [open]);

  const submit = () => {
    if (!farmId) return;
    attach.mutate(farmId, {
      onSuccess: () => {
        toast.success(t("admin.common.created"));
        onClose();
      },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("finance.contractFarms.add")}>
      <div className="space-y-4">
        {hasNoFarms ? (
          <p className="text-sm text-muted-foreground">
            {t("finance.contractFarms.noFarmsForCustomer")}
          </p>
        ) : (
          <Field label={t("finance.contractFarms.pickFarm")}>
            <Select value={farmId} onChange={(e) => setFarmId(e.target.value)}>
              <option value="">—</option>
              {available.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={attach.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button onClick={submit} disabled={attach.isPending || !farmId}>
            {attach.isPending ? t("admin.common.saving") : t("admin.common.save")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
