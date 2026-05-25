import type { CustomerResponse } from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCustomers } from "@/queries/customers";

/** Live customer search → select (the W3/W5 pattern). Used to link a POS sale to a customer. */
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
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const query = useCustomers({ search: debounced || undefined, take: 20 });
  const rows = query.data ?? [];

  return (
    <Dialog open={open} onClose={onClose} title={t("pos.link.selectCustomer")}>
      <div className="space-y-2">
        <Input
          autoFocus
          placeholder={t("pos.link.searchCustomer")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-72 divide-y overflow-auto rounded-xl border">
          {rows.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">{t("customers.empty")}</div>
          ) : (
            rows.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => onSelect(c)}
                className="flex w-full items-center justify-between gap-2 p-3 text-start text-sm transition-colors hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="font-medium">{c.fullName}</span>
                  {c.phonePrimary ? (
                    <span className="ms-2 text-xs text-muted-foreground" dir="ltr">
                      {c.phonePrimary}
                    </span>
                  ) : null}
                </span>
                <Badge variant="secondary">
                  {t(`customerType.${c.type}`, { defaultValue: c.type })}
                </Badge>
              </button>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
