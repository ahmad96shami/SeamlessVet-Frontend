import "../global.css";
import "@/i18n";

import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PowerSyncContext } from "@powersync/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAppFonts } from "@/lib/fonts";
import { queryClient } from "@/lib/queryClient";
import { ensureArabicRTL } from "@/lib/rtl";
import { initSentry } from "@/services/sentry";
import { startSyncEngine } from "@/services/syncEngine";
import { useAuthStore } from "@/stores/authStore";
import { powerSync } from "@/sync/database";

// Run before the component mounts so early errors are captured. Config-driven —
// no-op when SENTRY_DSN is unset (which is the dev default).
initSentry();

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

  // Tajawal must finish loading before we paint — RN won't repaint already-laid-
  // out text when a custom face arrives later, so a flash-of-system-font would
  // leave the first frame styled wrong.
  const [fontsLoaded] = useAppFonts();

  // Hydrate the auth state from secure-store on mount.
  const status = useAuthStore((s) => s.status);
  const restore = useAuthStore((s) => s.restore);
  useEffect(() => {
    void restore();
  }, [restore]);

  // Mo4.1: subscribe the offline REST queue's sync engine to PowerSync's connection
  // status. The engine flushes anything left from a prior session as soon as the
  // stream reports `connected` again — no per-screen wiring needed.
  useEffect(() => {
    const teardown = startSyncEngine();
    return teardown;
  }, []);

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

  if (!rtlReady || !fontsLoaded || status === "unknown") return null;
  return (
    <SafeAreaProvider>
      <PowerSyncContext.Provider value={powerSync}>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
        </QueryClientProvider>
      </PowerSyncContext.Provider>
    </SafeAreaProvider>
  );
}
