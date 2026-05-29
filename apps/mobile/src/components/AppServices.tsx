import { useEffect } from "react";

import { configureNotificationHandler, registerForPushNotificationsAsync } from "@/services/localNotifications";
import { useAuthStore } from "@/stores/authStore";

/**
 * Headless host for app-wide side-effect hooks that must live *inside* the React-Query / PowerSync
 * providers (so they can call those hooks) yet persist across navigation. Mounted once by the root
 * layout. The Mo7 notifications stack (realtime feed, deeplink routing, local reminders) hangs here.
 */
export function AppServices(): null {
  const status = useAuthStore((s) => s.status);

  // Set the foreground presentation handler once, before any notification can arrive.
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  // On sign-in: request permission + set up the channel + a best-effort push token.
  useEffect(() => {
    if (status !== "authenticated") return;
    void registerForPushNotificationsAsync();
  }, [status]);

  return null;
}
