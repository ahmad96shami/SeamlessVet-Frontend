import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { applyFieldErrors, type ApiError, type CenterOption } from "@vet/shared";

import vetHero from "../../assets/images/vet-hero.png";
import { Forward } from "@/components/icons";
import { Button, Card, Input, ListRow } from "@/components/ui";
import { useCenters, useLogin } from "@/queries/auth";
import { prefs } from "@/services/mmkv";
import { dialog } from "@/stores/dialogStore";
import { colors } from "@/theme";

type Step = "phone" | "center" | "password";

interface Creds {
  phonePrimary: string;
  password: string;
}

const LAST_PHONE_KEY = "auth.lastPhone";

// environmentId rides in from the picked center, not the form — so the credentials form validates
// just phone + password (the shared LoginRequestSchema's environmentId is supplied at submit).
const credsSchema = z.object({ phonePrimary: z.string().min(1), password: z.string().min(1) });

/**
 * Tenant-routed sign-in (Mo13): phone → `/auth/centers` → pick a center → password. The chosen
 * center's `environmentId` scopes the login; one center auto-advances, an empty result explains
 * itself. The last phone is remembered (MMKV) so a returning doctor starts one tap in.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const centersMut = useCenters();
  const loginMut = useLogin();

  const [step, setStep] = useState<Step>("phone");
  const [centers, setCenters] = useState<CenterOption[]>([]);
  const [selected, setSelected] = useState<CenterOption | null>(null);

  const form = useForm<Creds>({
    resolver: zodResolver(credsSchema),
    defaultValues: { phonePrimary: prefs.getString(LAST_PHONE_KEY) ?? "", password: "" },
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
        prefs.set(LAST_PHONE_KEY, phone); // remember the phone once it resolved to a center
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
      onError: (err) => {
        const error = err as ApiError;
        void dialog.alert(t("auth.login.title"), error.message ?? t("auth.center.none"));
      },
    });
  };

  const pickCenter = (center: CenterOption) => {
    setSelected(center);
    setStep("password");
  };

  const submitLogin = form.handleSubmit((values) => {
    if (!selected) return;
    loginMut.mutate(
      {
        request: {
          environmentId: selected.environmentId,
          phonePrimary: values.phonePrimary.trim(),
          password: values.password,
        },
        center: selected,
      },
      {
        // On success the auth store flips authenticated and the (auth) group redirects to the tabs,
        // unmounting this screen — so success needs no handler here; errors keep us mounted.
        onError: (err) => {
          const error = err as ApiError;
          applyFieldErrors(error, (name, e) => form.setError(name as never, e));
          if (!error.fieldErrors || Object.keys(error.fieldErrors).length === 0) {
            void dialog.alert(t("auth.login.title"), error.message ?? "Login failed");
          }
        },
      },
    );
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
            {step === "center" ? t("auth.center.select") : t("auth.login.title")}
          </Text>
          <Text className="text-ink-500 mb-5 mt-1.5 text-[13px] font-tajawal">{t("appName")}</Text>
        </View>

        <Card className="p-5">
          {step === "phone" ? (
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
                    onSubmitEditing={() => void lookupCenters()}
                    returnKeyType="next"
                  />
                )}
              />
              <Button
                label={t("auth.login.continue")}
                onPress={() => void lookupCenters()}
                loading={centersMut.isPending}
                block
              />
            </View>
          ) : null}

          {step === "center" ? (
            <View className="gap-3">
              <Text className="text-ink-500 text-[13px] font-tajawal">
                {t("auth.center.selectHint")}
              </Text>
              <View className="gap-2.5">
                {centers.map((center) => (
                  <ListRow key={center.environmentId} flat onPress={() => pickCenter(center)}>
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-navy-900 text-[15px] font-tajawal-bold"
                        numberOfLines={1}
                      >
                        {center.name}
                      </Text>
                    </View>
                    <Forward size={18} color={colors.ink[300]} />
                  </ListRow>
                ))}
              </View>
              <Button label={t("auth.center.back")} variant="ghost" onPress={goToPhone} block />
            </View>
          ) : null}

          {step === "password" ? (
            <View className="gap-3.5">
              {/* "signing in to {center}" — the picked tenant, so the doctor sees where they land. */}
              <View className="bg-ink-50 rounded-input px-4 py-3">
                <Text className="text-ink-500 text-[12px] font-tajawal">
                  {t("auth.center.signingInTo")}
                </Text>
                <Text className="text-navy-900 mt-0.5 text-[15px] font-tajawal-bold" numberOfLines={1}>
                  {selected?.name}
                </Text>
              </View>
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
                    onSubmitEditing={() => void submitLogin()}
                    returnKeyType="go"
                  />
                )}
              />
              <Button
                label={t("auth.login.submit")}
                onPress={() => void submitLogin()}
                loading={loginMut.isPending}
                block
              />
              <Button
                label={t("auth.center.change")}
                variant="ghost"
                onPress={() => (centers.length > 1 ? setStep("center") : goToPhone())}
                block
              />
            </View>
          ) : null}

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
