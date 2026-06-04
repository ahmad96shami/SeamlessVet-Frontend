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
import { Button, Card, Divider, Input, StateHero } from "@/components/ui";
import { omitEmptyStrings } from "@/lib/forms";
import { useRegister } from "@/queries/auth";
import { colors } from "@/theme";

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

  // The design's "حسابك قيد المراجعة" pending state — accounts stay inactive
  // until an admin approves the registration request.
  if (registerMut.isSuccess) {
    const submitted = form.getValues();
    return (
      <View className="bg-ink-50 flex-1 px-7 pt-16">
        <StateHero
          tone="teal"
          icon={<Shield size={52} color={colors.teal[600]} />}
          title={t("authExtra.pendingTitle")}
          body={t("authExtra.pendingBody")}
        />
        <Card className="mt-6 w-full p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-ink-500 text-[13px] font-tajawal">
              {t("auth.register.fullName")}
            </Text>
            <Text className="text-ink-900 text-[13px] font-tajawal-bold" numberOfLines={1}>
              {submitted.fullName}
            </Text>
          </View>
          <Divider dashed />
          <View className="flex-row items-center justify-between">
            <Text className="text-ink-500 text-[13px] font-tajawal">
              {t("authExtra.roleLabel")}
            </Text>
            <Text className="text-ink-900 text-[13px] font-tajawal-bold">
              {t("roles.vet_field")}
            </Text>
          </View>
        </Card>
        <View className="mt-auto pb-8">
          <Link href="/(auth)/login" asChild>
            <Button label={t("auth.register.signIn")} block />
          </Link>
        </View>
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
