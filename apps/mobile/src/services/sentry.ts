import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

/**
 * Config-driven Sentry init — DSN comes from the EAS profile env
 * (eas.json → app.config.ts → Constants.expoConfig.extra.sentryDsn). If
 * unset, init becomes a no-op, mirroring the backend's M13 pattern.
 *
 * Call once, as early as practical, from the root layout.
 */
export function initSentry(): void {
  const dsn = (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: (Constants.expoConfig?.extra as { profile?: string } | undefined)?.profile ?? "development",
    enableNative: true,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.1,
  });
}
