import {
  formatCurrency,
  type ContractMedicationPriceResponse,
  type ProductResponse,
} from "@vet/shared";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Money } from "@/components/ui/money";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  useContractMedicationPrices,
  useCreateContractMedicationPrice,
  useDeleteContractMedicationPrice,
  useUpdateContractMedicationPrice,
} from "@/queries/contracts";
import { useProducts } from "@/queries/products";

/**
 * Per-medication price overrides for a contract. Editable only while the parent contract is `draft`
 * (the backend rejects writes once active). Catalog price is shown struck-through next to the override.
 */
export function ContractMedicationPrices({
  contractId,
  isDraft,
}: {
  contractId: string;
  isDraft: boolean;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const list = useContractMedicationPrices(contractId);
  const products = useProducts({ category: "medication", take: 200 });
  const del = useDeleteContractMedicationPrice(contractId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ContractMedicationPriceResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContractMedicationPriceResponse | null>(null);

  const productById = useMemo(
    () => new Map((products.data ?? []).map((p) => [p.id, p] as const)),
    [products.data],
  );
  const rows = list.data ?? [];

  const confirmDelete = () => {
    if (!deleteTarget) return;
    del.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t("admin.common.deleted"));
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">{t("finance.contracts.medPrices.title")}</h4>
          <p className="text-xs text-muted-foreground">
            {isDraft
              ? t("finance.contracts.medPrices.subtitle")
              : t("finance.contracts.medPrices.draftOnly")}
          </p>
        </div>
        {isDraft ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Icon.plus className="size-4" />
            {t("finance.contracts.medPrices.add")}
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed p-3 text-center text-sm text-muted-foreground">
          {t("finance.contracts.medPrices.empty")}
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {rows.map((row) => {
            const product = productById.get(row.productId);
            return (
              <li key={row.id} className="flex items-center justify-between gap-2 p-2.5 text-sm">
                <span className="min-w-0 truncate">{product?.nameAr ?? row.productId}</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium"><Money value={row.contractPrice} /></span>
                  {product ? (
                    <span className="text-xs text-muted-foreground line-through">
                      <Money value={product.sellingPrice} />
                    </span>
                  ) : null}
                  {isDraft ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t("admin.common.edit")}
                        onClick={() => {
                          setEditing(row);
                          setDialogOpen(true);
                        }}
                      >
                        <Icon.edit className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={t("admin.common.delete")}
                        onClick={() => setDeleteTarget(row)}
                      >
                        <Icon.trash className="size-4 text-destructive" />
                      </Button>
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <MedicationPriceDialog
        open={dialogOpen}
        contractId={contractId}
        editing={editing}
        products={products.data ?? []}
        usedProductIds={new Set(rows.map((r) => r.productId))}
        onClose={() => setDialogOpen(false)}
      />

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t("admin.common.deleteConfirmTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("finance.contracts.medPrices.deleteConfirm")}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={del.isPending}>
              {t("admin.common.cancel")}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={del.isPending}>
              {t("admin.common.delete")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function MedicationPriceDialog({
  open,
  contractId,
  editing,
  products,
  usedProductIds,
  onClose,
}: {
  open: boolean;
  contractId: string;
  editing: ContractMedicationPriceResponse | null;
  products: ProductResponse[];
  usedProductIds: Set<string>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateContractMedicationPrice(contractId);
  const update = useUpdateContractMedicationPrice(contractId);
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");

  // Reset the local fields whenever the dialog opens (create = blank, edit = the row's values).
  useEffect(() => {
    if (!open) return;
    setProductId(editing?.productId ?? "");
    setPrice(editing != null ? String(editing.contractPrice) : "");
  }, [open, editing]);

  const pending = create.isPending || update.isPending;
  const priceNum = price.trim() === "" ? NaN : Number(price);
  const valid = (editing != null || productId !== "") && Number.isFinite(priceNum) && priceNum >= 0;

  const submit = () => {
    if (!valid) return;
    if (editing) {
      update.mutate(
        { priceId: editing.id, body: { contractPrice: priceNum } },
        {
          onSuccess: () => {
            toast.success(t("admin.common.updated"));
            onClose();
          },
        },
      );
    } else {
      create.mutate(
        { productId, contractPrice: priceNum },
        {
          onSuccess: () => {
            toast.success(t("admin.common.created"));
            onClose();
          },
        },
      );
    }
  };

  // On create, hide medications that already have an override (one row per product).
  const options = editing
    ? products.filter((p) => p.id === editing.productId)
    : products.filter((p) => !usedProductIds.has(p.id));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        editing ? t("finance.contracts.medPrices.editTitle") : t("finance.contracts.medPrices.addTitle")
      }
    >
      <div className="space-y-4">
        <Field label={t("finance.contracts.medPrices.product")}>
          <Select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={editing != null}
          >
            <option value="">—</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameAr}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("finance.contracts.medPrices.contractPrice")}>
          <Input
            type="number"
            step="0.01"
            min="0"
            dir="ltr"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {t("admin.common.cancel")}
          </Button>
          <Button onClick={submit} disabled={pending || !valid}>
            {pending ? t("admin.common.saving") : t("admin.common.save")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
