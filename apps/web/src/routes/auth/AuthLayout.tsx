import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toggleLanguage } from "@/i18n";

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className="absolute end-4 top-4"
      >
        <Icon.globe className="size-4" />
        {t("shell.language")}
      </Button>
      {children}
    </div>
  );
}
