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
 * Mo7.4 — route a tapped notification to its record. Handles a **warm** tap (the response listener,
 * while the app is running) and a **cold start** (the app was launched by the tap —
 * getLastNotificationResponseAsync, consumed once per session). Mounted in AppServices; only routes
 * while authenticated so we never push a protected route at/before sign-in.
 */
export function useNotificationDeeplinks(): void {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const coldStartHandled = useRef(false);

  // Warm taps.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (useAuthStore.getState().status !== "authenticated") return;
      routeFromData(router, response.notification.request.content.data);
    });
    return () => sub.remove();
  }, [router]);

  // Cold start: the app was opened by tapping a notification.
  useEffect(() => {
    if (status !== "authenticated" || coldStartHandled.current) return;
    coldStartHandled.current = true;
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) routeFromData(router, response.notification.request.content.data);
    });
  }, [status, router]);
}
