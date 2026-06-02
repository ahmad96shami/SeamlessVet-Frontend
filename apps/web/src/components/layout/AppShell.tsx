import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

import { NotificationBell } from "@/components/layout/NotificationBell";
import { SyncIndicator } from "@/components/layout/SyncIndicator";
import { Icon } from "@/components/ui/icon";
import { NAV_SECTION_ORDER, navForRole } from "@/config/nav";
import { useNotificationsRealtime } from "@/hooks/useNotificationsRealtime";
import { toggleLanguage } from "@/i18n";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

/**
 * The Center Web App shell: the design's collapsible right-edge rail (68px → 250px on hover),
 * grouped nav sections, a brand mark, and a footer with the current user + utility pills
 * (language toggle, sign-out, sync indicator). Page content renders in the scrolling `.page`.
 */
/**
 * If a future env-selector writes the picked env id to this key, the rail shows a small chip
 * so users can tell at a glance which env they're acting in (surfaces the partnership-env state
 * W8 introduced). Until the selector lands, the key is never set and the chip stays dormant.
 */
const SELECTED_ENV_STORAGE_KEY = "vet.web.selectedEnvironmentId";

export function AppShell() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  useNotificationsRealtime(); // open the SignalR hub for the session; live pushes → feed + toast
  const role = user?.role ?? "";
  const items = navForRole(role);
  const roleLabel = role ? t(`roles.${role}`, { defaultValue: role }) : "";
  const envId = user?.environmentId ?? "";
  const selectedEnv = typeof window !== "undefined" ? window.localStorage.getItem(SELECTED_ENV_STORAGE_KEY) : null;
  const showEnvChip = !!selectedEnv && !!envId && selectedEnv === envId;

  return (
    <div className="app-shell h-screen">
      <aside className="sidenav">
        <div className="sn-brand">
          <div className="sn-brand-mark">
            <Icon.stethoscope size={20} />
          </div>
          <div className="sn-brand-text">
            <span className="sn-brand-name">SeamlessVet</span>
            <span className="sn-brand-sub">{t("shell.center")}</span>
          </div>
        </div>

        <nav className="sn-items">
          {NAV_SECTION_ORDER.map((section, index) => {
            const sectionItems = items.filter((item) => item.section === section);
            if (sectionItems.length === 0) return null;
            return (
              <Fragment key={section}>
                {index > 0 ? <div className="sn-section-divider" role="separator" aria-label={t(section)} /> : null}
                {sectionItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    title={t(item.labelKey)}
                    className={({ isActive }) => cn("sn-item", isActive && "active")}
                  >
                    <span className="sn-ico">
                      <item.icon className="size-[18px]" />
                    </span>
                    <span className="sn-item-label">{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </Fragment>
            );
          })}
        </nav>

        <div className="sn-footer">
          <div className="sn-utility">
            <SyncIndicator />
            <NotificationBell />
            <button className="icon-pill" title={t("shell.language")} onClick={toggleLanguage}>
              <Icon.globe size={16} />
            </button>
            <span className="sn-utility-spacer" />
            <button className="icon-pill" title={t("shell.signOut")} onClick={() => void logout()}>
              <Icon.logout size={16} />
            </button>
          </div>
          <div className="sn-user">
            <div className="sn-user-av bg-navy-900">
              <Icon.user size={18} />
            </div>
            <div className="sn-user-text">
              <div className="sn-user-name">{roleLabel}</div>
              <div className="sn-user-role">
                {t("shell.center")}
                {showEnvChip ? (
                  <span className="sn-env-chip" title={envId}>
                    {t("shell.envIndicator")}
                  </span>
                ) : null}
              </div>
            </div>
            <span className="sn-user-chev">
              <Icon.fwd size={14} className="rtl:-scale-x-100" />
            </span>
          </div>
        </div>
      </aside>

      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
