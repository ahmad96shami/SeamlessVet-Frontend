import "../global.css";
import "@/i18n";

import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { queryClient } from "@/lib/queryClient";
import { ensureArabicRTL } from "@/lib/rtl";
import { useAuthStore } from "@/stores/authStore";

export default function RootLayout() {
  // First Arabic launch flips I18nManager.forceRTL(true) and reloads the JS
  // context once. Until that's settled we render nothing — the new context
  // re-enters this component with isRTL already true and falls straight through.
  const [rtlReady, setRtlReady] = useState(false);
  useEffect(() => {
    ensureArabicRTL().then((reloading) => {
      if (!reloading) setRtlReady(true);
    });
  }, []);

  // Hydrate the auth state from secure-store on mount.
  const status = useAuthStore((s) => s.status);
  const restore = useAuthStore((s) => s.restore);
  useEffect(() => {
    void restore();
  }, [restore]);

  // Auth gate: anyone not signed in is bounced to (auth)/login; signed-in users
  // in the (auth) group are bounced out. Wait for restore to settle (`unknown`).
  const router = useRouter();
  const segments = useSegments();
  useEffect(() => {
    if (status === "unknown") return;
    const inAuthGroup = segments[0] === "(auth)";
    if (status === "unauthenticated" && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (status === "authenticated" && inAuthGroup) {
      router.replace("/");
    }
  }, [status, segments, router]);

  if (!rtlReady || status === "unknown") return null;
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
