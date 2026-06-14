import { formatDate, type TenantSummary } from "@vet/shared";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { useReactivateTenant, useSuspendTenant, useTenant } from "@/queries/platform";
import { tenantStatusVariant } from "@/routes/platform/tenantStatus";

export function PlatformTenantDetailPage() {
  const { id = "" } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const query = useTenant(id || null);
  const suspend = useSuspendTenant();
  const reactivate = useReactivateTenant();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (query.isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Icon.spinner className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-4">
        <BackLink label={t("platform.tenants.backToList")} />
        <p className="text-sm text-muted-foreground">{t("platform.tenants.notFound")}</p>
      </div>
    );
  }

  const tnt: TenantSummary = query.data;
  const isSuspended = tnt.status === "suspended";
  const pending = suspend.isPending || reactivate.isPending;

  const confirmToggle = () => {
    const mut = isSuspended ? reactivate : suspend;
    mut.mutate(tnt.id, {
      onSuccess: () => {
        toast.success(t(isSuspended ? "platform.detail.reactivated" : "platform.detail.suspended"));
        setConfirmOpen(false);
      },
    });
  };

  return (
    <div className="space-y-6">
      <BackLink label={t("platform.tenants.backToList")} />

      <header className="flex flex-wrap items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon.shield className="size-7" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{tnt.name}</h1>
            <Badge variant={tenantStatusVariant(tnt.status)}>
              {t(`platform.status.${tnt.status}`, { defaultValue: tnt.status })}
            </Badge>
          </div>
          <p className="font-mono text-sm text-muted-foreground" dir="ltr">
            {tnt.code}
          </p>
        </div>
        <Button
          variant={isSuspended ? "default" : "destructive"}
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
        >
          <Icon.lock className="size-4" />
          {t(isSuspended ? "platform.detail.reactivate" : "platform.detail.suspend")}
        </Button>
      </header>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("platform.detail.mode")} value={t(`platform.mode.${tnt.mode}`, { defaultValue: tnt.mode })} />
        <Stat label={t("platform.detail.users")} value={<span dir="ltr">{tnt.userCount}</span>} />
        <Stat label={t("platform.detail.created")} value={<span dir="ltr">{formatDate(tnt.createdAt, lang)}</span>} />
        <Stat
          label={t("platform.detail.code")}
          value={
            <span className="font-mono text-base" dir="ltr">
              {tnt.code}
            </span>
          }
        />
      </dl>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t(isSuspended ? "platform.detail.reactivateConfirmTitle" : "platform.detail.suspendConfirmTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t(isSuspended ? "platform.detail.reactivateConfirmBody" : "platform.detail.suspendConfirmBody", {
              name: tnt.name,
            })}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={pending}>
              {t("admin.common.cancel")}
            </Button>
            <Button variant={isSuspended ? "default" : "destructive"} onClick={confirmToggle} disabled={pending}>
              {t(isSuspended ? "platform.detail.reactivate" : "platform.detail.suspend")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      to="/platform/tenants"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <Icon.chevronRight className="size-4 ltr:hidden" />
      <Icon.chevronLeft className="size-4 rtl:hidden" />
      {label}
    </Link>
  );
}
