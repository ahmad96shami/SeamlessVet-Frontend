import { zodResolver } from "@hookform/resolvers/zod";
import { applyFieldErrors, PlatformLoginRequestSchema, type ApiError, type PlatformLoginRequest } from "@vet/shared";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { toggleLanguage } from "@/i18n";
import { usePlatformLogin } from "@/queries/platform";

/**
 * Platform super-admin sign-in (W25) — a single global phone + password (no tenant routing). On
 * success the platform store flips authenticated and the guard admits to the tenants console.
 * Reuses the design system but NOT the tenant {@link AuthLayout} (the platform realm has its own brand).
 */
export function PlatformLoginPage() {
  const { t } = useTranslation();
  const login = usePlatformLogin();

  const form = useForm<PlatformLoginRequest>({
    resolver: zodResolver(PlatformLoginRequestSchema),
    defaultValues: { phone: "", password: "" },
  });

  const submit = form.handleSubmit((values) => {
    login.mutate(values, {
      onError: (error: ApiError) => applyFieldErrors(error, (name, e) => form.setError(name as never, e)),
    });
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas p-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className="absolute end-4 top-4 text-white hover:bg-white/15"
      >
        <Icon.globe className="size-4" />
        {t("platform.shell.language")}
      </Button>

      <div className="flex flex-col items-center gap-3 text-white">
        <div className="grid size-14 place-items-center rounded-2xl bg-teal-500/25 text-teal-100 ring-1 ring-teal-400/40 shadow-[0_10px_36px_rgba(26,143,161,0.45)]">
          <Icon.shield size={28} />
        </div>
        <span className="text-2xl font-extrabold tracking-tight">{t("platform.appName")}</span>
      </div>

      <Card className="w-full max-w-sm border-0 shadow-[var(--shadow-pop)]">
        <CardHeader>
          <CardTitle>{t("platform.login.title")}</CardTitle>
          <CardDescription>{t("platform.login.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Field label={t("platform.login.phone")} error={form.formState.errors.phone?.message}>
              <Input type="tel" dir="ltr" autoComplete="username" autoFocus {...form.register("phone")} />
            </Field>
            <Field label={t("platform.login.password")} error={form.formState.errors.password?.message}>
              <Input type="password" autoComplete="current-password" {...form.register("password")} />
            </Field>
            <Button type="submit" variant="teal" className="w-full" disabled={login.isPending}>
              {t("platform.login.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
