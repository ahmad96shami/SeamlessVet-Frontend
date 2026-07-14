import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from "@microsoft/signalr";
import { NotificationResponseSchema, type NotificationResponse } from "@vet/shared";

import { API_BASE_URL } from "@/lib/config";
import { tokenStorage } from "@/services/tokenStorage";

/**
 * The realtime notifications client (M11 — `/hubs/notifications`).
 *
 * SignalR is the one place tokens travel on the query string (`?access_token=`) — WebSocket
 * handshakes can't carry an `Authorization` header — so `accessTokenFactory` hands the connection
 * the current access token from {@link tokenStorage} on every (re)connect; since the Axios
 * interceptor keeps localStorage refreshed, reconnects pick up a fresh token automatically.
 *
 * The server pushes one method, `ReceiveNotification(NotificationPayload)`, to the connection's
 * `user_{id}` / `environment_{id}` / `admins_{env}` groups. We parse each push through the shared
 * schema (the hub payload === the REST shape) and fan it out to subscribers. A single shared
 * connection is started on login and stopped on logout.
 */

type NotificationHandler = (notification: NotificationResponse) => void;

let connection: HubConnection | null = null;
const handlers = new Set<NotificationHandler>();

/** Subscribe to live pushes; returns an unsubscribe. */
export function onNotification(handler: NotificationHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

/** Open the hub connection (idempotent — a second call while connected is a no-op). */
export async function startNotificationsHub(): Promise<void> {
  if (connection) return;

  const conn = new HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/notifications`, {
      accessTokenFactory: () => tokenStorage.getTokens()?.accessToken ?? "",
      // Auth rides the ?access_token= query string, not cookies — so the negotiate/handshake must
      // NOT send credentials. The SignalR client defaults `withCredentials` to true, which the
      // backend CORS policy (no AllowCredentials) rejects on preflight. Turn it off.
      withCredentials: false,
    })
    .withAutomaticReconnect()
    // Information (not Warning) so the SignalR client prints negotiate/transport selection to the
    // browser console — the fastest way to diagnose a hub that won't connect in a deployed env.
    .configureLogging(LogLevel.Information)
    .build();

  conn.on("ReceiveNotification", (raw: unknown) => {
    const parsed = NotificationResponseSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("[notifications] dropped a push that failed schema validation", raw);
      return;
    }
    for (const handler of handlers) handler(parsed.data);
  });

  // Surface the connection lifecycle so a silent realtime failure is visible in DevTools.
  conn.onreconnecting((err) => console.warn("[notifications] hub reconnecting", err));
  conn.onreconnected((id) => console.info("[notifications] hub reconnected", id));
  conn.onclose((err) =>
    err
      ? console.error("[notifications] hub closed with error", err)
      : console.info("[notifications] hub closed"),
  );

  connection = conn;

  try {
    await conn.start();
    console.info(`[notifications] hub connected → ${API_BASE_URL}/hubs/notifications`);
  } catch (err) {
    // A hard handshake failure (401, CORS, negotiate 404, mixed-content, or the API being down) is
    // non-fatal — the feed still works over REST — but it was previously swallowed with no trace, so
    // "no realtime notifications" looked like a mystery. Log it loudly; `withAutomaticReconnect` only
    // retries drops AFTER a first successful connect, so an initial failure stays down for the session.
    console.error(
      `[notifications] hub failed to start (${API_BASE_URL}/hubs/notifications) — realtime pushes are off; the REST feed still works`,
      err,
    );
    if (connection === conn) connection = null;
  }
}

/** Close the hub connection (on logout). */
export async function stopNotificationsHub(): Promise<void> {
  const conn = connection;
  connection = null;
  if (conn && conn.state !== HubConnectionState.Disconnected) {
    await conn.stop();
  }
}
