import { type ProductResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";

import { ProductFormDialog } from "@/routes/admin/ProductFormDialog";

/**
 * A vaccine IS a products-catalog row pinned to category `vaccine` (M26 — reverses the M22
 * vaccines-as-services model). This is a thin vaccine-worded wrapper over {@link ProductFormDialog}
 * (full product CRUD: cost / expiry / reorder), so the اللقاحات tab and the inline "add vaccine"
 * pickers share one form. `onCreated` fires with the new product id for inline selection.
 */
export function VaccineFormDialog({
  open,
  vaccine,
  onClose,
  defaultName,
  onCreated,
}: {
  open: boolean;
  vaccine: ProductResponse | null;
  onClose: () => void;
  /** Prefill the Arabic name when opening a fresh form (e.g. the text typed into a picker search). */
  defaultName?: string;
  /** Fired with the new vaccine's id after a create (not an edit) — lets callers select it inline. */
  onCreated?: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <ProductFormDialog
      open={open}
      product={vaccine}
      onClose={onClose}
      defaultName={defaultName}
      onCreated={onCreated}
      lockedCategory="vaccine"
      newTitle={t("vaccinations.vaccines.newTitle")}
      editTitle={t("vaccinations.vaccines.editTitle")}
    />
  );
}
