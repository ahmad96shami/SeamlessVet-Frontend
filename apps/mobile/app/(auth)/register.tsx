import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  RegisterRequestSchema,
  type ApiError,
  type RegisterRequest,
} from "@vet/shared";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { TextField } from "@/components/TextField";
import { omitEmptyStrings } from "@/lib/forms";
import { useRegister } from "@/queries/auth";

// The mobile app is the field-doctor client; only vet_field self-registers here.
// Admin/accountant/center-staff accounts are created by an admin (web).
const ROLE: RegisterRequest["requestedRoleKey"] = "vet_field";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const registerMut = useRegister();
  const form = useForm<RegisterRequest>({
    resolver: zodResolver(RegisterRequestSchema),
    defaultValues: {
      fullName: "",
      phonePrimary: "",
      email: "",
      password: "",
      requestedRoleKey: ROLE,
      licenseNumber: "",
      licenseDetails: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    // Empty optional text → omitted (stored as null on the backend, never ""),
    // matching the web pattern. Critical for `license_details` (jsonb) which
    // rejects empty strings, and `email` (unique-when-present) where "" would
    // collide between accounts.
    registerMut.mutate(omitEmptyStrings(values), {
      onError: (err) => {
        const error = err as ApiError;
        applyFieldErrors(error, (name, e) => form.setError(name as never, e));
        if (!error.fieldErrors || Object.keys(error.fieldErrors).length === 0) {
          Alert.alert(t("auth.register.title"), error.message ?? "Registration failed");
        }
      },
    });
  });

  if (registerMut.isSuccess) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="mb-2 text-2xl font-bold text-slate-900">{t("auth.register.title")}</Text>
        <Text className="mb-6 text-center text-sm text-slate-600">{t("auth.register.pending")}</Text>
        <Link href="/(auth)/login" className="text-base font-medium text-teal-700">
          {t("auth.register.signIn")}
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="flex-grow px-6 py-8">
        <Text className="mb-1 text-2xl font-bold text-slate-900">{t("auth.register.title")}</Text>
        <Text className="mb-6 text-sm text-slate-500">{t("appName")}</Text>

        <Controller
          control={form.control}
          name="fullName"
          render={({ field, fieldState }) => (
            <Field label={t("auth.register.fullName")} error={fieldState.error?.message}>
              <TextField
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoComplete="name"
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="phonePrimary"
          render={({ field, fieldState }) => (
            <Field label={t("auth.register.phone")} error={fieldState.error?.message}>
              <TextField
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="phone-pad"
                autoComplete="tel"
                autoCapitalize="none"
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field label={t("auth.register.email")} error={fieldState.error?.message}>
              <TextField
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field label={t("auth.register.password")} error={fieldState.error?.message}>
              <TextField
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureTextEntry
                autoComplete="password-new"
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="licenseNumber"
          render={({ field, fieldState }) => (
            <Field label={t("auth.register.licenseNumber")} error={fieldState.error?.message}>
              <TextField
                value={field.value ?? ""}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            </Field>
          )}
        />

        <View className="mt-2">
          <Button label={t("auth.register.submit")} onPress={onSubmit} loading={registerMut.isPending} />
        </View>

        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-sm text-slate-500">{t("auth.register.haveAccount")} </Text>
          <Link href="/(auth)/login" className="text-sm font-medium text-teal-700">
            {t("auth.register.signIn")}
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
