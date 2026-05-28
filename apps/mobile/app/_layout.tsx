import "../global.css";

import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ensureArabicRTL } from "@/lib/rtl";

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

  if (!rtlReady) return null;
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  );
}
