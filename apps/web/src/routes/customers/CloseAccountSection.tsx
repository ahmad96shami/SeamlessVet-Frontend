import {
  formatCurrency,
  type CloseAccountResponse,
  type CustomerResponse,
} from "@vet/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Money } from "@/components/ui/money";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useCloseAccount, useReopenAccount } from "@/queries/entitlements";
import { useCloseFarmAccount, useReopenFarmAccount } from "@/queries/farms";
import { entitlementStatusVariant } from "@/routes/finance/statusVariants";
import { useAuthStore } from "@/stores/authStore";

const SETTLEMENT_ROLES = ["admin", "accountant"];

/**
 * Close-account action (M9/M16 settlement workflow), for either a **customer** (its own ledger) or a
 * single **farm** ledger. Payout authority, so shown only to admin/accountant. Closing requires a
 * **zero balance** (the settlement lock — partial payments never release); the button is disabled
 * otherwise and the precondition is surfaced. On success the resulting/refreshed doctor entitlements
 * are listed. A 409 `settlement_locked` (e.g. a race) explains the balance precondition.
 */
function CloseAccountBase({
  kind,
  ownerId,
  balance,
  isClosed,
}: {
  kind: "customer" | "farm";
  ownerId: string;
  balance: number;
  isClosed: boolean;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const role = useAuthStore((s) => s.user?.role);
  // Both hooks always run (React rules); only the matching mutation fires.
  const closeCustomer = useCloseAccount();
  const closeFarm = useCloseFarmAccount();
  const close = kind === "farm" ? closeFarm : closeCustomer;
  const reopenCustomer = useReopenAccount();
  const reopenFarm = useReopenFarmAccount();
  const reopen = kind === "farm" ? reopenFarm : reopenCustomer;
  const doctors = useDoctorOptions();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reopenConfirmOpen, setReopenConfirmOpen] = useState(false);
  const [result, setResult] = useState<CloseAccountResponse | null>(null);

  if (!role || !SETTLEMENT_ROLES.includes(role)) return null;

  const ns = kind === "farm" ? "finance.closeFarmAccount" : "finance.closeAccount";
  const canClose = balance === 0;

  const doReopen = () =>
    reopen.mutate(ownerId, {
      onSuccess: () => {
        setReopenConfirmOpen(false);
        toast.success(t(`${ns}.reopened`));
      },
      onError: (e) => {
        setReopenConfirmOpen(false);
        toast.error(e.message);
      },
    });
  const doctorName = (id: string | null | undefined) =>
    (id ? doctors.byId.get(id) : undefined) ?? "—";

  const doClose = () =>
    close.mutate(ownerId, {
      onSuccess: (res) => {
        setConfirmOpen(false);
        setResult(res);
        toast.success(t(`${ns}.closed`));
      },
      onError: (e) => {
        setConfirmOpen(false);
        // The close endpoint rejects a non-zero balance with `account_not_settled` (a race past the
        // disabled button); `settlement_locked` is mapped too for safety.
        toast.error(
          e.code === "account_not_settled" || e.code === "settlement_locked"
            ? t(`${ns}.balanceMustBeZero`, { balance: formatCurrency(balance, lang) })
            : e.message,
        );
      },
    });

  return (
    <>
      {isClosed ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border p-4 text-sm">
          <Icon.shield className="size-4 text-success" />
          <span className="font-medium">{t(`${ns}.closed`)}</span>
          {/* Re-open so a returning customer's new visit can be billed (charges never auto-reopen). */}
          <Button
            variant="outline"
            size="sm"
            className="ms-auto"
            onClick={() => setReopenConfirmOpen(true)}
            disabled={reopen.isPending}
          >
            {t(`${ns}.reopen`)}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border p-4">
          <div>
            <h3 className="text-sm font-semibold">{t(`${ns}.title`)}</h3>
            <p className="text-sm text-muted-foreground">{t(`${ns}.body`)}</p>
          </div>
          {!canClose ? (
            <div className="alert amber">
              <Icon.shield className="alert-ico size-4" />
              <span>{t(`${ns}.balanceMustBeZero`, { balance: formatCurrency(balance, lang) })}</span>
            </div>
          ) : null}
          <Button onClick={() => setConfirmOpen(true)} disabled={!canClose || close.isPending}>
            <Icon.shield className="size-4" />
            {t(`${ns}.action`)}
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title={t(`${ns}.title`)}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t(`${ns}.body`)}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={close.isPending}>
              {t("admin.common.cancel")}
            </Button>
            <Button onClick={doClose} disabled={close.isPending}>
              {t(`${ns}.confirm`)}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={reopenConfirmOpen} onClose={() => setReopenConfirmOpen(false)} title={t(`${ns}.reopen`)}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t(`${ns}.reopenBody`)}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReopenConfirmOpen(false)} disabled={reopen.isPending}>
              {t("admin.common.cancel")}
            </Button>
            <Button onClick={doReopen} disabled={reopen.isPending}>
              {t(`${ns}.reopenConfirm`)}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={result !== null} onClose={() => setResult(null)} title={t(`${ns}.resulting`)}>
        <div className="space-y-3">
          {result && result.entitlements.length > 0 ? (
            <ul className="divide-y rounded-xl border">
              {result.entitlements.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 p-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{doctorName(e.doctorId)}</span>
                    <span className="ms-2 text-xs text-muted-foreground">
                      {t(`entitlementSystem.${e.calculationSystem}`, {
                        defaultValue: e.calculationSystem,
                      })}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">
                      <Money value={e.computedAmount} />
                    </span>
                    <Badge variant={entitlementStatusVariant(e.status)}>
                      {t(`entitlementStatus.${e.status}`, { defaultValue: e.status })}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t(`${ns}.noEntitlements`)}</p>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setResult(null)}>
              {t("admin.common.cancel")}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/** Customer close-account (the customer's own ledger). */
export function CloseAccountSection({ customer }: { customer: CustomerResponse }) {
  return (
    <CloseAccountBase
      kind="customer"
      ownerId={customer.id}
      balance={customer.ownBalance}
      // The OWN ledger's status (not the aggregate, which reads open if any farm ledger is open) —
      // otherwise an own-closed customer with an open farm would never show the reopen action.
      isClosed={(customer.ownLedgerStatus ?? customer.ledgerStatus) === "closed"}
    />
  );
}

/** Single-farm close-account (M16). */
export function CloseFarmAccountSection({
  farmId,
  balance,
  isClosed,
}: {
  farmId: string;
  balance: number;
  isClosed: boolean;
}) {
  return <CloseAccountBase kind="farm" ownerId={farmId} balance={balance} isClosed={isClosed} />;
}
