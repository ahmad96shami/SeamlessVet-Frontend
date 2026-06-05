import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

import { notificationRoute } from "@/lib/notificationRoute";
import { useAuthStore } from "@/stores/authStore";

type AppRouter = ReturnType<typeof useRouter>;

function routeFromData(router: AppRouter, data: unknown): void {
  const rec = data && typeof data === "object" ? (data as Record<string, unknown>) : undefined;
  const type = typeof rec?.type === "string" ? rec.type : undefined;
  if (!type) return;
  const href = notificationRoute(type, rec?.payload);
  if (href) router.push(href);
}

/**
 * Mo7.4 (+ Mo10) — route a tapped notification to its record. Handles a **warm** tap (the response
 * listener, while the app is running) and a **cold start** (the app was launched by the tap).
 * Mounted in AppServices; only routes while authenticated so we never push a protected route
 * at/before sign-in.
 *
 * Cold-start subtlety (Mo10 live-smoke finding): Android REPLAYS the launch tap to the response
 * listener as soon as it subscribes — before the async auth restore flips the store — so an
 * early-arriving response must be BUFFERED, not dropped, and routed once authenticated.
 * `getLastNotificationResponseAsync` stays as the fallback for the opposite race (auth restored
 * before the listener replay).
 *
 * KNOWN DEV-CLIENT LIMITATION (cannot be fixed here): expo-dev-launcher's cold-launch redirect
 * strips the notification extras, so in a development build a killed-app tap opens the app on home
 * — neither the listener nor getLast ever sees the response (verified on the S20+, Mo10 smoke).
 * Warm taps work everywhere; the cold path must be re-verified on a release/preview build.
 */
export function useNotificationDeeplinks(): void {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const coldStartHandled = useRef(false);
  const pendingData = useRef<unknown>(null);

  // Taps while the JS runtime is up — warm taps route immediately; a pre-auth (cold-start replay)
  // tap is parked for the auth effect below.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (useAuthStore.getState().status !== "authenticated") {
        pendingData.current = data;
        return;
      }
      routeFromData(router, data);
    });
    return () => sub.remove();
  }, [router]);

  // Cold start: the app was opened by tapping a notification.
  useEffect(() => {
    if (status !== "authenticated" || coldStartHandled.current) return;
    coldStartHandled.current = true;

    if (pendingData.current != null) {
      routeFromData(router, pendingData.current);
      pendingData.current = null;
      return;
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) routeFromData(router, response.notification.request.content.data);
    });
  }, [status, router]);
}
