import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toggleLanguage } from "@/i18n";

/** Auth backdrop: the iconic teal canvas with the brand lockup above a floating white card. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className="absolute end-4 top-4 text-white hover:bg-white/15"
      >
        <Icon.globe className="size-4" />
        {t("shell.language")}
      </Button>

      <div className="flex flex-col items-center gap-3 text-white">
        <div className="grid size-14 place-items-center rounded-2xl bg-teal-500/25 text-teal-100 ring-1 ring-teal-400/40 shadow-[0_10px_36px_rgba(26,143,161,0.45)]">
          <Icon.stethoscope size={28} />
        </div>
        <span className="text-2xl font-extrabold tracking-tight">SeamlessVet</span>
      </div>

      {children}
    </div>
  );
}
