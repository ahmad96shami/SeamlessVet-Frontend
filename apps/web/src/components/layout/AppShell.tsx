import { Globe, LogOut, PawPrint } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { navForRole } from "@/config/nav";
import { toggleLanguage } from "@/i18n";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

export function AppShell() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const items = navForRole(user?.role ?? "");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-e bg-card md:flex">
        <div className="flex items-center gap-2 px-5 py-4 font-semibold">
          <PawPrint className="size-5 text-primary" />
          <span className="truncate">{t("appName")}</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent",
                )
              }
            >
              <item.icon className="size-4" />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {user ? t(`roles.${user.role}`, { defaultValue: user.role }) : null}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleLanguage}>
              <Globe className="size-4" />
              {t("shell.language")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              <LogOut className="size-4" />
              {t("shell.signOut")}
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
