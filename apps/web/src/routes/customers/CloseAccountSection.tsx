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
import { useCloseAccount } from "@/queries/entitlements";
import { entitlementStatusVariant } from "@/routes/finance/statusVariants";
import { useAuthStore } from "@/stores/authStore";

const SETTLEMENT_ROLES = ["admin", "accountant"];

/**
 * Close-account action (M9 settlement workflow). Payout authority, so it's shown only to admin/
 * accountant. Closing requires a **zero balance** (the settlement lock — partial payments never
 * release); the button is disabled otherwise and the precondition is surfaced. On success the
 * resulting/refreshed doctor entitlements are listed. A 409 `settlement_locked` from the server
 * (e.g. a race) explains the balance precondition rather than showing a raw error.
 */
export function CloseAccountSection({ customer }: { customer: CustomerResponse }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const role = useAuthStore((s) => s.user?.role);
  const close = useCloseAccount();
  const doctors = useDoctorOptions();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<CloseAccountResponse | null>(null);

  if (!role || !SETTLEMENT_ROLES.includes(role)) return null;

  const isClosed = customer.ledgerStatus === "closed";
  const canClose = customer.balance === 0;
  const doctorName = (id: string | null | undefined) =>
    (id ? doctors.byId.get(id) : undefined) ?? "—";

  const doClose = () =>
    close.mutate(customer.id, {
      onSuccess: (res) => {
        setConfirmOpen(false);
        setResult(res);
        toast.success(t("finance.closeAccount.closed"));
      },
      onError: (e) => {
        setConfirmOpen(false);
        toast.error(
          e.code === "settlement_locked"
            ? t("finance.closeAccount.balanceMustBeZero", {
                balance: formatCurrency(customer.balance, lang),
              })
            : e.message,
        );
      },
    });

  return (
    <>
      {isClosed ? (
        <div className="flex items-center gap-2 rounded-2xl border p-4 text-sm">
          <Icon.shield className="size-4 text-success" />
          <span className="font-medium">{t("finance.closeAccount.closed")}</span>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border p-4">
          <div>
            <h3 className="text-sm font-semibold">{t("finance.closeAccount.title")}</h3>
            <p className="text-sm text-muted-foreground">{t("finance.closeAccount.body")}</p>
          </div>
          {!canClose ? (
            <div className="alert amber">
              <Icon.shield className="alert-ico size-4" />
              <span>
                {t("finance.closeAccount.balanceMustBeZero", {
                  balance: formatCurrency(customer.balance, lang),
                })}
              </span>
            </div>
          ) : null}
          <Button onClick={() => setConfirmOpen(true)} disabled={!canClose || close.isPending}>
            <Icon.shield className="size-4" />
            {t("finance.closeAccount.action")}
          </Button>
        </div>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("finance.closeAccount.title")}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("finance.closeAccount.body")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={close.isPending}>
              {t("admin.common.cancel")}
            </Button>
            <Button onClick={doClose} disabled={close.isPending}>
              {t("finance.closeAccount.confirm")}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={result !== null}
        onClose={() => setResult(null)}
        title={t("finance.closeAccount.resulting")}
      >
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
                    <span className="font-medium"><Money value={e.computedAmount} /></span>
                    <Badge variant={entitlementStatusVariant(e.status)}>
                      {t(`entitlementStatus.${e.status}`, { defaultValue: e.status })}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t("finance.closeAccount.noEntitlements")}</p>
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
