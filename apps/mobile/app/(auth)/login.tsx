import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
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

import vetHero from "../../assets/images/vet-hero.png";
import { Button, Card, Input } from "@/components/ui";
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
    });
  });

  return (
    <KeyboardAvoidingView
      className="bg-paper flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center">
          {/* The design's hero illustration (vendored from the prototype assets). */}
          <Image
            source={vetHero}
            style={{ width: 180, height: 180 }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <Text className="text-navy-900 mt-1 text-[26px] font-tajawal-extrabold">
            {t("auth.login.title")}
          </Text>
          <Text className="text-ink-500 mb-5 mt-1.5 text-[13px] font-tajawal">{t("appName")}</Text>
        </View>

        <Card className="p-5">
          <View className="gap-3.5">
            <Controller
              control={form.control}
              name="phonePrimary"
              render={({ field, fieldState }) => (
                <Input
                  label={t("auth.login.phone")}
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
              name="password"
              render={({ field, fieldState }) => (
                <Input
                  label={t("auth.login.password")}
                  error={fieldState.error?.message}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  secureTextEntry
                  autoComplete="password"
                />
              )}
            />
          </View>

          <View className="mt-5">
            <Button
              label={t("auth.login.submit")}
              onPress={onSubmit}
              loading={loginMut.isPending}
              block
            />
          </View>

          <View className="mt-4 flex-row items-center justify-center gap-1">
            <Text className="text-ink-500 text-[13px] font-tajawal">
              {t("auth.login.noAccount")}
            </Text>
            <Link href="/(auth)/register" className="text-teal-600 text-[13px] font-tajawal-extrabold">
              {t("auth.login.createOne")}
            </Link>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
