import { type ApiError, type CustomerResponse, type PetResponse } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CustomerCombobox } from "@/routes/customers/CustomerCombobox";
import { useTransferPet } from "@/queries/pets";

/** Move a pet to another owner. Picks the target customer via a live search; excludes the current owner. */
export function TransferPetDialog({
  pet,
  currentCustomerId,
  onClose,
}: {
  pet: PetResponse | null;
  currentCustomerId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const transfer = useTransferPet();
  const [target, setTarget] = useState<CustomerResponse | null>(null);

  // Reset the picker each time the dialog opens for a (new) pet.
  useEffect(() => {
    if (pet) setTarget(null);
  }, [pet]);

  const onConfirm = () => {
    if (!pet || !target) return;
    transfer.mutate(
      { id: pet.id, targetCustomerId: target.id },
      {
        onSuccess: () => {
          toast.success(t("customers.pets.transferred"));
          onClose();
        },
        onError: (e: ApiError) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={pet !== null} onClose={onClose} title={t("customers.pets.transferTitle")}>
      {pet ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("customers.pets.transferHint", { name: pet.name })}
          </p>
          <CustomerCombobox
            value={target}
            onChange={setTarget}
            excludeIds={[currentCustomerId]}
            placeholder={t("customers.pets.transferSearch")}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={transfer.isPending}>
              {t("admin.common.cancel")}
            </Button>
            <Button onClick={onConfirm} disabled={!target || transfer.isPending}>
              {transfer.isPending ? t("admin.common.saving") : t("customers.pets.transferSubmit")}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
