import type { ApiError, ContractResponse } from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useContractTransition } from "@/queries/contracts";
import { useSyncStore } from "@/stores/syncStore";

/**
 * Lifecycle actions for the selected contract. Only `draft`/`active` contracts act (terminal ones are
 * read-only — this renders nothing for them, so the caller can omit the footer border). Activation is
 * the gate: permission-gated server-side (`contracts.activate`) and **online-only** (the activate
 * button is disabled offline; a 403/409 from the server surfaces as a toast). complete/cancel confirm
 * inline via a dialog.
 */
export function ContractLifecycleActions({
  contract,
  onEdit,
}: {
  contract: ContractResponse;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const online = useSyncStore((s) => s.online);
  const activate = useContractTransition("activate");
  const complete = useContractTransition("complete");
  const cancel = useContractTransition("cancel");
  const [confirm, setConfirm] = useState<null | "complete" | "cancel">(null);

  const isDraft = contract.status === "draft";
  const isActive = contract.status === "active";
  if (!isDraft && !isActive) return null;

  const pending = activate.isPending || complete.isPending || cancel.isPending;
  const onError = (e: ApiError) => toast.error(e.message);

  const doActivate = () =>
    activate.mutate(contract.id, {
      onSuccess: () => toast.success(t("admin.common.updated")),
      onError,
    });

  const runConfirmed = () => {
    const m = confirm === "complete" ? complete : cancel;
    m.mutate(contract.id, {
      onSuccess: () => {
        toast.success(t("admin.common.updated"));
        setConfirm(null);
      },
      onError,
    });
  };

  return (
    <div className="space-y-3">
      {isDraft ? (
        <div className="alert amber">
          <Icon.shield className="alert-ico size-4" />
          <div>
            <b>{t("finance.lifecycle.gateTitle")}:</b> {t("finance.lifecycle.gateHint")}{" "}
            {t("finance.lifecycle.activateBody")}
            <div className="mt-1 opacity-90">
              <code className="font-mono">contracts.activate</code> · {t("finance.lifecycle.onlineOnly")}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="flex-1" onClick={onEdit} disabled={pending}>
          <Icon.edit className="size-4" />
          {isDraft ? t("finance.lifecycle.edit") : t("admin.common.edit")}
        </Button>
        {isDraft ? (
          <Button className="flex-1" onClick={doActivate} disabled={pending || !online}>
            <Icon.shield className="size-4" />
            {t("finance.lifecycle.activate")}
          </Button>
        ) : null}
        {isActive ? (
          <Button className="flex-1" onClick={() => setConfirm("complete")} disabled={pending}>
            <Icon.check className="size-4" />
            {t("finance.lifecycle.complete")}
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => setConfirm("cancel")} disabled={pending}>
          <Icon.trash className="size-4 text-destructive" />
          {isDraft ? t("finance.lifecycle.reject") : t("finance.lifecycle.cancel")}
        </Button>
      </div>

      {isDraft && !online ? (
        <p className="text-xs text-muted-foreground">{t("finance.lifecycle.onlineOnly")}</p>
      ) : null}

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "complete" ? t("finance.lifecycle.complete") : t("finance.lifecycle.cancel")}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {confirm === "complete"
              ? t("finance.lifecycle.completeConfirm")
              : t("finance.lifecycle.cancelConfirm")}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={pending}>
              {t("admin.common.cancel")}
            </Button>
            <Button
              variant={confirm === "cancel" ? "destructive" : "default"}
              onClick={runConfirmed}
              disabled={pending}
            >
              {confirm === "complete"
                ? t("finance.lifecycle.complete")
                : t("finance.lifecycle.cancel")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
