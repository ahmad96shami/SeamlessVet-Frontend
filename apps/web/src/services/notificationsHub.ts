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
    .configureLogging(LogLevel.Warning)
    .build();

  conn.on("ReceiveNotification", (raw: unknown) => {
    const parsed = NotificationResponseSchema.safeParse(raw);
    if (!parsed.success) return;
    for (const handler of handlers) handler(parsed.data);
  });

  connection = conn;

  try {
    await conn.start();
  } catch {
    // A hard handshake failure (e.g. a 401, or the API being down) is non-fatal: the feed still
    // works over REST, and `withAutomaticReconnect` retries transient drops once connected.
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
