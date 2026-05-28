import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  RegisterRequestSchema,
  ROLE_KEY_VALUES,
  type ApiError,
  type RegisterRequest,
} from "@vet/shared";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Field } from "@/components/form/Field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/queries/auth";
import { AuthLayout } from "@/routes/auth/AuthLayout";

// Admin/accountant are assigned by an admin, not self-requested.
const SELECTABLE_ROLES = ROLE_KEY_VALUES.filter((r) => r !== "admin" && r !== "accountant");

export function RegisterPage() {
  const { t } = useTranslation();
  const register = useRegister();
  const form = useForm<RegisterRequest>({
    resolver: zodResolver(RegisterRequestSchema),
    defaultValues: {
      fullName: "",
      phonePrimary: "",
      email: "",
      password: "",
      requestedRoleKey: "vet_field",
      licenseNumber: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    register.mutate(values, {
      onError: (error: ApiError) => applyFieldErrors(error, (name, e) => form.setError(name as never, e)),
    });
  });

  if (register.isSuccess) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-sm border-0 shadow-[var(--shadow-pop)]">
          <CardHeader>
            <CardTitle>{t("auth.register.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("auth.register.pending")}</p>
            <Link to="/login" className={buttonVariants({ variant: "teal", className: "w-full" })}>
              {t("auth.register.signIn")}
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  const errors = form.formState.errors;

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm border-0 shadow-[var(--shadow-pop)]">
        <CardHeader>
          <CardTitle>{t("auth.register.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label={t("auth.register.fullName")} error={errors.fullName?.message}>
              <Input autoComplete="name" {...form.register("fullName")} />
            </Field>
            <Field label={t("auth.register.phone")} error={errors.phonePrimary?.message}>
              <Input type="tel" dir="ltr" {...form.register("phonePrimary")} />
            </Field>
            <Field label={t("auth.register.email")} error={errors.email?.message}>
              <Input type="email" dir="ltr" {...form.register("email")} />
            </Field>
            <Field label={t("auth.register.password")} error={errors.password?.message}>
              <Input type="password" autoComplete="new-password" {...form.register("password")} />
            </Field>
            <Field label={t("auth.register.role")} error={errors.requestedRoleKey?.message}>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form.register("requestedRoleKey")}
              >
                {SELECTABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {t(`roles.${role}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("auth.register.licenseNumber")} error={errors.licenseNumber?.message}>
              <Input dir="ltr" {...form.register("licenseNumber")} />
            </Field>
            <Button type="submit" variant="teal" className="w-full" disabled={register.isPending}>
              {t("auth.register.submit")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("auth.register.haveAccount")}{" "}
            <Link to="/login" className="text-primary hover:underline">
              {t("auth.register.signIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
