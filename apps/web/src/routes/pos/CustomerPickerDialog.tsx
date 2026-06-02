import type { CustomerResponse } from "@vet/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCustomer, useCustomers } from "@/queries/customers";
import { CustomerFormDialog } from "@/routes/customers/CustomerFormDialog";

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

  // Inline "add customer" — reuses the customers-page form; the new id is then fetched and selected.
  const [addOpen, setAddOpen] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const createdQuery = useCustomer(createdId);

  useEffect(() => {
    if (!open) return;
    setAddOpen(false);
    setCreatedId(null);
  }, [open]);

  // Once the freshly-created customer is fetched, select it (mirrors picking an existing row).
  useEffect(() => {
    if (createdId && createdQuery.data) {
      setCreatedId(null);
      onSelect(createdQuery.data);
    }
  }, [createdId, createdQuery.data, onSelect]);

  return (
    <Dialog open={open} onClose={onClose} title={t("pos.link.selectCustomer")}>
      <div className="space-y-2">
        <Input
          autoFocus
          placeholder={t("pos.link.searchCustomer")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="overflow-hidden rounded-xl border">
          <div className="max-h-72 divide-y overflow-auto">
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
        {rows.length === 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setAddOpen(true)}
          >
            {t("visits.create.addCustomer")}
          </Button>
        ) : null}
      </div>

      <CustomerFormDialog
        open={addOpen}
        customer={null}
        defaultName={search.trim()}
        onClose={() => setAddOpen(false)}
        onCreated={(id) => setCreatedId(id)}
      />
    </Dialog>
  );
}
