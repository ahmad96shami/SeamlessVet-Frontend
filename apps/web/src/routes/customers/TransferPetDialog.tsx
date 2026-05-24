import { type ApiError, type CustomerResponse, type PetResponse } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/queries/customers";
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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [target, setTarget] = useState<CustomerResponse | null>(null);

  const query = useCustomers({ search: debouncedSearch || undefined, take: 20 });
  const candidates = (query.data ?? []).filter((c) => c.id !== currentCustomerId);

  // Reset the picker each time the dialog opens for a (new) pet.
  useEffect(() => {
    if (pet) {
      setSearch("");
      setTarget(null);
    }
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
          <Input
            placeholder={t("customers.pets.transferSearch")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-60 divide-y overflow-auto rounded-xl border">
            {candidates.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">{t("customers.empty")}</div>
            ) : (
              candidates.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setTarget(c)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 p-3 text-start text-sm transition-colors hover:bg-muted",
                    target?.id === c.id && "bg-primary/10",
                  )}
                >
                  <span className="min-w-0">
                    <span className="font-medium">{c.fullName}</span>
                    {c.phonePrimary ? (
                      <span className="ms-2 text-xs text-muted-foreground" dir="ltr">
                        {c.phonePrimary}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">
                      {t(`customerType.${c.type}`, { defaultValue: c.type })}
                    </Badge>
                    {target?.id === c.id ? <Icon.check className="size-4 text-primary" /> : null}
                  </span>
                </button>
              ))
            )}
          </div>
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
