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

import { Shield } from "@/components/icons";
import { Button, Input } from "@/components/ui";
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
      <View className="bg-paper flex-1 items-center justify-center px-6">
        <View className="bg-amber-soft mb-4 h-16 w-16 items-center justify-center rounded-card">
          <Shield size={32} color="#8A6A00" />
        </View>
        <Text className="text-navy-900 mb-2 text-[20px] font-tajawal-extrabold">
          {t("auth.register.title")}
        </Text>
        <Text className="text-ink-500 mb-6 text-center text-[14px] font-tajawal">
          {t("auth.register.pending")}
        </Text>
        <Link href="/(auth)/login" className="text-teal-700 text-[15px] font-tajawal-bold">
          {t("auth.register.signIn")}
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="bg-paper flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-6">
          <Text className="text-navy-900 text-[24px] font-tajawal-extrabold">
            {t("auth.register.title")}
          </Text>
          <Text className="text-ink-500 mt-1 text-[14px] font-tajawal">{t("appName")}</Text>
        </View>

        <View className="gap-3.5">
          <Controller
            control={form.control}
            name="fullName"
            render={({ field, fieldState }) => (
              <Input
                label={t("auth.register.fullName")}
                error={fieldState.error?.message}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoComplete="name"
              />
            )}
          />
          <Controller
            control={form.control}
            name="phonePrimary"
            render={({ field, fieldState }) => (
              <Input
                label={t("auth.register.phone")}
                error={fieldState.error?.message}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="phone-pad"
                autoComplete="tel"
                autoCapitalize="none"
              />
            )}
          />
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Input
                label={t("auth.register.email")}
                error={fieldState.error?.message}
                value={field.value ?? ""}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
              />
            )}
          />
          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Input
                label={t("auth.register.password")}
                error={fieldState.error?.message}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureTextEntry
                autoComplete="password-new"
              />
            )}
          />
          <Controller
            control={form.control}
            name="licenseNumber"
            render={({ field, fieldState }) => (
              <Input
                label={t("auth.register.licenseNumber")}
                error={fieldState.error?.message}
                value={field.value ?? ""}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </View>

        <View className="mt-6">
          <Button
            label={t("auth.register.submit")}
            onPress={onSubmit}
            loading={registerMut.isPending}
            block
          />
        </View>

        <View className="mt-6 flex-row items-center justify-center gap-1">
          <Text className="text-ink-500 text-[13px] font-tajawal">
            {t("auth.register.haveAccount")}
          </Text>
          <Link href="/(auth)/login" className="text-teal-700 text-[13px] font-tajawal-bold">
            {t("auth.register.signIn")}
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
