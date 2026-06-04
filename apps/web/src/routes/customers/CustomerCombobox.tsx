import { formatCurrency, type CustomerResponse } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Combobox } from "@/components/ui/combobox";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCustomer, useCustomers } from "@/queries/customers";
import { CustomerFormDialog } from "@/routes/customers/CustomerFormDialog";

/**
 * The app-wide customer picker: a server-searched {@link Combobox} (debounced live search over
 * name/phone, take 20) with the inline add-customer flow built in — the "add new" row opens
 * {@link CustomerFormDialog} prefilled with the search term and auto-selects the result.
 * Replaces the W3/W5-era search-input + candidate-list blocks for one consistent design.
 */
export function CustomerCombobox({
  value,
  onChange,
  excludeIds,
  allowCreate = true,
  showBalance = false,
  placeholder,
  disabled,
}: {
  value: CustomerResponse | null;
  onChange: (customer: CustomerResponse) => void;
  /** Hide specific customers (e.g. a pet-transfer's current owner). */
  excludeIds?: string[];
  /** Offer the inline "add new customer" row (default true). */
  allowCreate?: boolean;
  /** Append the open balance to rows that have one (POS collection flows). */
  showBalance?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term, 300);
  const customersQuery = useCustomers({ search: debounced.trim() || undefined, take: 20 });
  const candidates = (customersQuery.data ?? []).filter((c) => !excludeIds?.includes(c.id));

  // Inline "add customer" — the new id is fetched, then selected like any picked row.
  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultName, setAddDefaultName] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const createdQuery = useCustomer(createdId);
  useEffect(() => {
    if (createdId && createdQuery.data) {
      setCreatedId(null);
      onChange(createdQuery.data);
    }
  }, [createdId, createdQuery.data, onChange]);

  const sublabel = (c: CustomerResponse): string | undefined => {
    const parts = [c.phonePrimary, showBalance && c.balance > 0 ? formatCurrency(c.balance, i18n.language) : null];
    return parts.filter(Boolean).join(" · ") || undefined;
  };

  return (
    <>
      <Combobox
        value={value?.id ?? ""}
        selectedLabel={value?.fullName}
        onChange={(id) => {
          const picked = candidates.find((c) => c.id === id);
          if (picked) onChange(picked);
        }}
        options={candidates.map((c) => ({
          value: c.id,
          label: c.fullName,
          sublabel: sublabel(c),
        }))}
        serverFiltered
        onTermChange={setTerm}
        placeholder={placeholder ?? t("customers.pickerPlaceholder")}
        disabled={disabled}
        onCreateNew={
          allowCreate
            ? (searched) => {
                setAddDefaultName(searched);
                setAddOpen(true);
              }
            : undefined
        }
      />
      {allowCreate ? (
        <CustomerFormDialog
          open={addOpen}
          customer={null}
          defaultName={addDefaultName}
          onClose={() => setAddOpen(false)}
          onCreated={(id) => setCreatedId(id)}
        />
      ) : null}
    </>
  );
}
