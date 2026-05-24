import { zodResolver } from "@hookform/resolvers/zod";
import { applyFieldErrors, LoginRequestSchema, type ApiError, type LoginRequest } from "@vet/shared";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/queries/auth";
import { AuthLayout } from "@/routes/auth/AuthLayout";

export function LoginPage() {
  const { t } = useTranslation();
  const login = useLogin();
  const form = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { phonePrimary: "", password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, {
      onError: (error: ApiError) => applyFieldErrors(error, (name, e) => form.setError(name as never, e)),
    });
  });

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("auth.login.title")}</CardTitle>
          <CardDescription>{t("appName")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label={t("auth.login.phone")} error={form.formState.errors.phonePrimary?.message}>
              <Input type="tel" dir="ltr" autoComplete="username" {...form.register("phonePrimary")} />
            </Field>
            <Field label={t("auth.login.password")} error={form.formState.errors.password?.message}>
              <Input type="password" autoComplete="current-password" {...form.register("password")} />
            </Field>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {t("auth.login.submit")}
            </Button>
          </form>
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
