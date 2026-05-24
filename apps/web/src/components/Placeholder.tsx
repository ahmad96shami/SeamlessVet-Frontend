import { useTranslation } from "react-i18next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Stand-in screen for routes whose real implementation lands in a later milestone. */
export function Placeholder({ titleKey, milestone }: { titleKey: string; milestone: string }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>{t(titleKey)}</CardTitle>
          <CardDescription>{t("placeholder.title")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t("placeholder.body", { milestone })}
        </CardContent>
      </Card>
    </div>
  );
}
