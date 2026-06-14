import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toggleLanguage } from "@/i18n";
import { usePlatformAuthStore } from "@/stores/platformAuthStore";

/**
 * The platform console shell (W25) — a deliberately minimal chrome distinct from the tenant
 * {@link AppShell}: a top bar with the platform brand, the signed-in admin, language toggle and sign
 * out, over an `<Outlet/>`. No tenant sidebar / nav (the platform realm only manages centers).
 */
export function PlatformLayout() {
  const { t } = useTranslation();
  const admin = usePlatformAuthStore((s) => s.admin);
  const logout = usePlatformAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon.shield className="size-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold leading-tight">{t("platform.appName")}</div>
            <div className="text-xs text-muted-foreground">{t("platform.shell.title")}</div>
          </div>
          {admin ? <span className="hidden text-sm text-muted-foreground sm:inline">{admin.fullName}</span> : null}
          <Button variant="ghost" size="sm" onClick={toggleLanguage}>
            <Icon.globe className="size-4" />
            <span className="hidden sm:inline">{t("platform.shell.language")}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            <Icon.logout className="size-4" />
            <span className="hidden sm:inline">{t("platform.shell.signOut")}</span>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
