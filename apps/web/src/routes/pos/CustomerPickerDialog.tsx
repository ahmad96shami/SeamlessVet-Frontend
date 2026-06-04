import type { CustomerResponse } from "@vet/shared";
import { useTranslation } from "react-i18next";

import { Field } from "@/components/form/Field";
import { Dialog } from "@/components/ui/dialog";
import { CustomerCombobox } from "@/routes/customers/CustomerCombobox";

/** Customer pick → select (the shared CustomerCombobox). Used to link a POS sale to a customer. */
export function CustomerPickerDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (customer: CustomerResponse) => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} title={t("pos.link.selectCustomer")}>
      <Field label={t("pos.voucher.customer")}>
        <CustomerCombobox value={null} onChange={onSelect} showBalance />
      </Field>
    </Dialog>
  );
}
