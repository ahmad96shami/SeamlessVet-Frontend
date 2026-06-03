import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { useCustomer } from "@/queries/customers";
import { useFarm } from "@/queries/farms";
import { CloseFarmAccountSection } from "@/routes/customers/CloseAccountSection";
import { balanceClass, statusVariant } from "@/routes/customers/ledgerStatus";
import { StatementSection } from "@/routes/customers/StatementSection";

/**
 * A single farm's account page (M16). Reached from the customer detail page's farms section. The
 * farm's balance + ledger status come from the owning customer's `farmLedgers[]` breakdown (one read
 * that also yields the owner's name/phone for the statement). Hosts the per-farm statement (reusing
 * the customer statement component in farm mode) and the close-farm-account action.
 */
export function FarmDetailPage() {
  const { farmId = "" } = useParams();
  const { t } = useTranslation();
  const farmQuery = useFarm(farmId || null);
  const farm = farmQuery.data;
  const ownerQuery = useCustomer(farm?.customerId ?? null);
  const owner = ownerQuery.data;

  const ledger = useMemo(
    () => (owner?.farmLedgers ?? []).find((fl) => fl.farmId === farmId),
    [owner?.farmLedgers, farmId],
  );

  if (farmQuery.isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Icon.spinner className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (farmQuery.isError || !farm) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <BackLink to="/operations/customers" label={t("customers.backToList")} />
        <p className="text-sm text-muted-foreground">{t("customers.farmDetail.notFound")}</p>
      </div>
    );
  }

  const balance = ledger?.balance ?? 0;
  const status = ledger?.status ?? "open";
  const isClosed = status === "closed";
  const detailBits = [
    farm.animalType,
    farm.headCount != null ? `${farm.headCount}` : null,
    farm.location,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackLink
        to={`/operations/customers/${farm.customerId}`}
        label={t("customers.farmDetail.backToCustomer")}
      />

      <header className="flex flex-wrap items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon.box className="size-7" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{farm.name}</h1>
            <Badge variant={statusVariant(status)}>
              {t(`ledgerStatus.${status}`, { defaultValue: status })}
            </Badge>
            <Badge variant="secondary">{t(`farmKind.${farm.kind}`, { defaultValue: farm.kind })}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {owner ? (
              <>
                {t("customers.farmDetail.owner")}:{" "}
                <Link to={`/operations/customers/${farm.customerId}`} className="hover:underline">
                  {owner.fullName}
                </Link>
                {detailBits.length > 0 ? ` · ${detailBits.join(" · ")}` : null}
              </>
            ) : (
              detailBits.join(" · ")
            )}
          </p>
        </div>
      </header>

      <div className="rounded-2xl border p-4">
        <div className="text-sm text-muted-foreground">{t("customers.farmDetail.balance")}</div>
        <div className={cn("text-2xl font-bold", balanceClass(balance))} dir="ltr">
          <Money value={balance} />
        </div>
      </div>

      {owner ? <CloseFarmAccountSection farmId={farm.id} balance={balance} isClosed={isClosed} /> : null}

      <StatementSection
        farmId={farm.id}
        ownerName={farm.name}
        ownerPhone={owner?.phonePrimary}
        fallbackBalance={balance}
      />
    </div>
  );
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <Icon.chevronRight className="size-4 ltr:hidden" />
      <Icon.chevronLeft className="size-4 rtl:hidden" />
      {label}
    </Link>
  );
}
