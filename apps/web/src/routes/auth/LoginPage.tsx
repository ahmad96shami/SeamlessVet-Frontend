import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { applyFieldErrors, type ApiError, type CenterOption } from "@vet/shared";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useCenters, useLogin } from "@/queries/auth";
import { AuthLayout } from "@/routes/auth/AuthLayout";
import { getLastPhone } from "@/services/centerMemory";
import { useAuthStore } from "@/stores/authStore";

type Step = "phone" | "center" | "password";

interface Creds {
  phonePrimary: string;
  password: string;
}

/**
 * Tenant-routed sign-in (W24): phone → `/auth/centers` → pick a center → password. The chosen
 * center's `environmentId` scopes the login; one center auto-advances, an empty result explains
 * itself. The last phone is remembered so a returning user starts one tap in.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const centersMut = useCenters();
  const login = useLogin();
  const endedReason = useAuthStore((s) => s.endedReason);

  const [step, setStep] = useState<Step>("phone");
  const [centers, setCenters] = useState<CenterOption[]>([]);
  const [selected, setSelected] = useState<CenterOption | null>(null);

  useEffect(() => {
    // Landed here because a session ended on its own (expired at boot / failed refresh / the center
    // was suspended)? Explain why. Subscribed (not read-once): when the page boots directly on
    // /login this mounts BEFORE App's effect runs restore(), so the reason is set after first run.
    // One-shot consume + a stable toast id keep StrictMode's double effect to a single toast.
    if (endedReason) {
      const reason = useAuthStore.getState().consumeEndedReason();
      if (reason) {
        const key = reason === "suspended" ? "auth.session.suspendedToast" : "auth.session.expiredToast";
        toast.error(t(key), { id: `session-${reason}`, duration: 8000 });
      }
    }
  }, [endedReason, t]);

  const credsSchema = useMemo(
    () => z.object({ phonePrimary: z.string().min(1), password: z.string().min(1) }),
    [],
  );
  const form = useForm<Creds>({
    resolver: zodResolver(credsSchema),
    defaultValues: { phonePrimary: getLastPhone(), password: "" },
  });

  const goToPhone = () => {
    setStep("phone");
    setSelected(null);
    setCenters([]);
    form.setValue("password", "");
  };

  const lookupCenters = async () => {
    if (!(await form.trigger("phonePrimary"))) return;
    const phone = form.getValues("phonePrimary").trim();
    centersMut.mutate(phone, {
      onSuccess: (list) => {
        setCenters(list);
        const [first] = list;
        if (!first) {
          form.setError("phonePrimary", { message: t("auth.center.none") });
        } else if (list.length === 1) {
          setSelected(first);
          setStep("password");
        } else {
          setStep("center");
        }
      },
    });
  };

  const pickCenter = (center: CenterOption) => {
    setSelected(center);
    setStep("password");
  };

  const submitLogin = form.handleSubmit((values) => {
    if (!selected) return;
    const phone = values.phonePrimary.trim();
    login.mutate(
      {
        request: { environmentId: selected.environmentId, phonePrimary: phone, password: values.password },
        center: selected,
      },
      {
        // remember-last + session set run in the hook-level onSuccess (this call's onSuccess would be
        // skipped — a successful login unmounts this page on the redirect); errors keep us mounted.
        onError: (error: ApiError) => applyFieldErrors(error, (name, e) => form.setError(name as never, e)),
      },
    );
  });

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm border-0 shadow-[var(--shadow-pop)]">
        <CardHeader>
          <CardTitle>{step === "center" ? t("auth.center.select") : t("auth.login.title")}</CardTitle>
          <CardDescription>{t("appName")}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void lookupCenters();
              }}
              className="space-y-4"
              noValidate
            >
              <Field label={t("auth.login.phone")} error={form.formState.errors.phonePrimary?.message}>
                <Input type="tel" dir="ltr" autoComplete="username" {...form.register("phonePrimary")} />
              </Field>
              <Button type="submit" variant="teal" className="w-full" disabled={centersMut.isPending}>
                {t("auth.login.continue")}
              </Button>
            </form>
          ) : null}

          {step === "center" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("auth.center.selectHint")}</p>
              <ul className="space-y-2">
                {centers.map((center) => (
                  <li key={center.environmentId}>
                    <button
                      type="button"
                      onClick={() => pickCenter(center)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-input bg-background px-4 py-3 text-start transition-colors hover:border-primary hover:bg-accent"
                    >
                      <span className="font-medium">{center.name}</span>
                      <Icon.fwd size={16} className="text-muted-foreground rtl:-scale-x-100" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={goToPhone}
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                {t("auth.center.back")}
              </button>
            </div>
          ) : null}

          {step === "password" ? (
            <form onSubmit={submitLogin} className="space-y-4" noValidate>
              <div className="rounded-lg bg-muted px-4 py-3">
                <div className="text-xs text-muted-foreground">{t("auth.center.signingInTo")}</div>
                <div className="font-medium">{selected?.name}</div>
              </div>
              <Field label={t("auth.login.password")} error={form.formState.errors.password?.message}>
                <Input type="password" autoComplete="current-password" autoFocus {...form.register("password")} />
              </Field>
              <Button type="submit" variant="teal" className="w-full" disabled={login.isPending}>
                {t("auth.login.submit")}
              </Button>
              <button
                type="button"
                onClick={() => (centers.length > 1 ? setStep("center") : goToPhone())}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                {t("auth.center.change")}
              </button>
            </form>
          ) : null}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("auth.login.noAccount")}{" "}
            <Link to="/register" className="text-primary hover:underline">
              {t("auth.login.createOne")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
