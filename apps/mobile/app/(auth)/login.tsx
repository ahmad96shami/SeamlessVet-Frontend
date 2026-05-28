import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  LoginRequestSchema,
  type ApiError,
  type LoginRequest,
} from "@vet/shared";

import { Button } from "@/components/Button";
import { Field } from "@/components/Field";
import { TextField } from "@/components/TextField";
import { useLogin } from "@/queries/auth";

export default function LoginScreen() {
  const { t } = useTranslation();
  const loginMut = useLogin();
  const form = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { phonePrimary: "", password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    loginMut.mutate(values, {
      onError: (err) => {
        const error = err as ApiError;
        applyFieldErrors(error, (name, e) => form.setError(name as never, e));
        if (!error.fieldErrors || Object.keys(error.fieldErrors).length === 0) {
          Alert.alert(t("auth.login.title"), error.message ?? "Login failed");
        }
      },
      // onSuccess: nav flips automatically — the root layout's auth gate
      // bounces authenticated users out of (auth) and into the app.
    });
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-8">
        <Text className="mb-1 text-2xl font-bold text-slate-900">{t("auth.login.title")}</Text>
        <Text className="mb-6 text-sm text-slate-500">{t("appName")}</Text>

        <Controller
          control={form.control}
          name="phonePrimary"
          render={({ field, fieldState }) => (
            <Field label={t("auth.login.phone")} error={fieldState.error?.message}>
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
          name="password"
          render={({ field, fieldState }) => (
            <Field label={t("auth.login.password")} error={fieldState.error?.message}>
              <TextField
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                secureTextEntry
                autoComplete="password"
              />
            </Field>
          )}
        />

        <View className="mt-2">
          <Button label={t("auth.login.submit")} onPress={onSubmit} loading={loginMut.isPending} />
        </View>

        <View className="mt-6 flex-row items-center justify-center">
          <Text className="text-sm text-slate-500">{t("auth.login.noAccount")} </Text>
          <Link href="/(auth)/register" className="text-sm font-medium text-teal-700">
            {t("auth.login.createOne")}
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
