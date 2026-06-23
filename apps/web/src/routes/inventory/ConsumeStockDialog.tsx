import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useConsumeStock, useFieldInventories } from "@/queries/inventory";
import { useProducts } from "@/queries/products";

// Sentinel for "central warehouse": the consume request omits the location entirely (the server
// then defaults to the env's single central warehouse). A real field-inventory id selects a field
// location (locationType=field, locationId=that id).
const WAREHOUSE = "__warehouse__";

/**
 * Record internal use (consumption) of an is_consumable product (M27): product + quantity + reason
 * + location → `POST /inventory/consume` (FEFO-deducted). The product picker is limited to products
 * flagged consumable in the catalog; reason is mandatory (server-enforced).
 */
export function ConsumeStockDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const consume = useConsumeStock();
  const products = useProducts({ take: 200 });
  const fieldInventories = useFieldInventories();

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState(WAREHOUSE);

  useEffect(() => {
    if (!open) return;
    setProductId("");
    setQuantity("");
    setReason("");
    setLocation(WAREHOUSE);
  }, [open]);

  const consumableOptions = useMemo(
    () =>
      (products.data ?? [])
        .filter((p) => p.isConsumable)
        .map((p) => ({ value: p.id, label: p.nameAr, keywords: p.nameLatin ?? undefined })),
    [products.data],
  );

  const qtyNum = Number(quantity);
  const valid =
    productId !== "" &&
    quantity.trim() !== "" &&
    !Number.isNaN(qtyNum) &&
    qtyNum > 0 &&
    reason.trim() !== "";

  const onSubmit = () => {
    if (!valid) return;
    const loc =
      location === WAREHOUSE ? {} : { locationType: "field" as const, locationId: location };
    consume.mutate(
      { productId, quantity: qtyNum, reason: reason.trim(), ...loc },
      {
        onSuccess: () => {
          toast.success(t("inventory.consumables.success"));
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("inventory.consumables.dialogTitle")}>
      <div className="space-y-4">
        <Field label={t("inventory.consumables.product")}>
          <Combobox
            value={productId}
            onChange={setProductId}
            options={consumableOptions}
            placeholder={t("inventory.consumables.selectProduct")}
          />
          {!products.isLoading && consumableOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("inventory.consumables.noConsumables")}</p>
          ) : null}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("inventory.consumables.quantity")}>
            <Input
              type="number"
              step="0.001"
              min="0"
              dir="ltr"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label={t("inventory.consumables.location")}>
            <Select value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value={WAREHOUSE}>{t("inventory.location.warehouse")}</option>
              {(fieldInventories.data ?? []).map((fi) => (
                <option key={fi.id} value={fi.id}>
                  {fi.doctorName}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("inventory.consumables.reason")}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={consume.isPending}>
            {t("admin.common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={!valid || consume.isPending}>
            {consume.isPending ? t("admin.common.saving") : t("inventory.consumables.submit")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
