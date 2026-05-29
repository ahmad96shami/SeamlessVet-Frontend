import type { ExpoConfig } from "expo/config";

// Per-profile env vars come from eas.json (`build.<profile>.env`), or from
// the developer's shell at `expo start`. EXPO_PUBLIC_* are also exposed to
// JS at bundle time; we surface them explicitly via `extra` so reads go
// through Constants.expoConfig.extra (one resolution point).
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:5180";
const POWERSYNC_URL = process.env.EXPO_PUBLIC_POWERSYNC_URL ?? "http://localhost:8080";
const SENTRY_DSN = process.env.SENTRY_DSN ?? "";

const config: ExpoConfig = {
  name: "SeamlessVet Field",
  slug: "vet-mobile",
  scheme: "vetmobile",
  version: "0.0.1",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  // New architecture (Fabric/TurboModules) is the default in Expo SDK 56 — no
  // explicit toggle needed. PowerSync's RN SDK (Mo1) requires it.
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.seamlessvet.mobile",
  },
  android: {
    package: "com.seamlessvet.mobile",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-localization",
    "expo-updates",
    [
      // PRD §12 calls for Android 9+ (API 28) and iOS 14+. Android 28 is
      // honored as-is; iOS deploymentTarget is bumped to 16.4 because that's
      // Expo SDK 56's hard floor (the older iOS 14 line predates current Expo).
      "expo-build-properties",
      {
        android: { minSdkVersion: 28 },
        ios: { deploymentTarget: "16.4" },
      },
    ],
    [
      // Mo6 attachments: camera + gallery capture of X-rays / lab photos. Arabic
      // permission strings (iOS Info.plist usage descriptions).
      "expo-image-picker",
      {
        cameraPermission: "يستخدم التطبيق الكاميرا لتصوير الأشعة والمستندات وإرفاقها بالزيارة.",
        photosPermission: "يصل التطبيق إلى صورك لإرفاق ملف بالزيارة.",
      },
    ],
    "@sentry/react-native/expo",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: API_URL,
    powersyncUrl: POWERSYNC_URL,
    sentryDsn: SENTRY_DSN,
  },
};

export default config;
