import { type FarmResponse } from "@vet/shared";
import { useState } from "react";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useFarms } from "@/queries/farms";
import { FarmFormDialog } from "@/routes/customers/FarmFormDialog";

/**
 * Farm picker mirroring {@link import("./CustomerCombobox").CustomerCombobox}: a searchable
 * {@link Combobox} over the chosen customer's farms (client-filtered — the per-customer list is
 * small and already scoped) with an inline "add farm" row that opens {@link FarmFormDialog}
 * prefilled with the search term and auto-selects the new farm. A farm belongs to a customer, so
 * the picker is disabled until one is chosen.
 */
export function FarmCombobox({
  customerId,
  value,
  onChange,
  allowCreate = true,
  noneLabel,
  placeholder,
  disabled,
}: {
  /** Owning customer — farms are scoped to it; the picker is disabled while empty. */
  customerId: string | undefined;
  /** Selected farm id (`""` = none). */
  value: string;
  onChange: (farmId: string) => void;
  /** Offer the inline "add new farm" row (default true). */
  allowCreate?: boolean;
  /** When set, a leading row that clears the selection back to "no farm" (farm is optional). */
  noneLabel?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const farmsQuery = useFarms({ customerId: customerId || undefined, take: 200 });
  const farms: FarmResponse[] = customerId ? (farmsQuery.data ?? []) : [];

  const [addOpen, setAddOpen] = useState(false);
  const [addDefaultName, setAddDefaultName] = useState("");

  const sublabel = (f: FarmResponse): string | undefined =>
    [f.animalType, f.location].filter(Boolean).join(" · ") || undefined;

  const options: ComboboxOption[] = [
    ...(noneLabel ? [{ value: "", label: noneLabel }] : []),
    ...farms.map((f) => ({ value: f.id, label: f.name, sublabel: sublabel(f) })),
  ];

  return (
    <>
      <Combobox
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder ?? noneLabel}
        disabled={disabled || !customerId}
        onCreateNew={
          allowCreate && customerId
            ? (term) => {
                setAddDefaultName(term);
                setAddOpen(true);
              }
            : undefined
        }
      />
      {allowCreate && customerId ? (
        <FarmFormDialog
          open={addOpen}
          customerId={customerId}
          farm={null}
          defaultName={addDefaultName}
          onClose={() => setAddOpen(false)}
          onCreated={(id) => onChange(id)}
        />
      ) : null}
    </>
  );
}
