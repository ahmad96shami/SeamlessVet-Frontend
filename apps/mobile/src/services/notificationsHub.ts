import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { NotificationResponseSchema, type NotificationResponse } from "@vet/shared";

import { API_BASE_URL } from "@/lib/config";
import { tokenStorage } from "@/services/tokenStorage";

/**
 * Mo7.2 — the live notification channel, mirroring web W10's `notificationsHub.ts`.
 *
 * A single SignalR connection to `/hubs/notifications`. Auth rides the `?access_token=` query string
 * (a WebSocket can't carry an Authorization header), so the negotiate/handshake must NOT send
 * credentials — `withCredentials:false`, the same CORS fix web needed (the backend policy has no
 * AllowCredentials). The token factory is **async** here (secure-store), and SignalR re-invokes it on
 * every (re)connect, so a refreshed token is picked up automatically.
 *
 * The connection only delivers while the app is foregrounded + online — that's the Mo7 "SignalR +
 * local" scope. The durable feed is the REST `/notifications` endpoint (Mo7.3); reminders are local
 * (Mo7.4). Server pushes are per-user (the hub joins a `user_{id}` group from the JWT `sub`).
 */

type Handler = (n: NotificationResponse) => void;

const handlers = new Set<Handler>();
let connection: HubConnection | null = null;

function build(): HubConnection {
  const conn = new HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hubs/notifications`, {
      accessTokenFactory: async () => (await tokenStorage.getTokens())?.accessToken ?? "",
      withCredentials: false,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  // Server → client method (the backend's strongly-typed INotificationClient.ReceiveNotification).
  conn.on("ReceiveNotification", (raw: unknown) => {
    const parsed = NotificationResponseSchema.safeParse(raw);
    if (!parsed.success) return;
    for (const handler of handlers) handler(parsed.data);
  });

  return conn;
}

/** Subscribe to live pushes; returns an unsubscribe. Handlers persist across reconnects. */
export function onNotification(handler: Handler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

/**
 * Open the connection (idempotent — a no-op while already connected/connecting/reconnecting). Safe to
 * call when offline: `start()` rejects and we swallow it, leaving the connection disconnected for the
 * next retry (the realtime hook re-calls this when connectivity returns).
 */
export async function startNotificationsHub(): Promise<void> {
  if (!connection) connection = build();
  if (
    connection.state === HubConnectionState.Connected ||
    connection.state === HubConnectionState.Connecting ||
    connection.state === HubConnectionState.Reconnecting
  ) {
    return;
  }
  try {
    await connection.start();
  } catch {
    // Offline / server unreachable — leave it disconnected; a later startNotificationsHub() retries.
  }
}

/** Stop + drop the connection (logout). Handlers are owned by the React hook's effect cleanup. */
export async function stopNotificationsHub(): Promise<void> {
  const conn = connection;
  connection = null;
  if (!conn) return;
  try {
    await conn.stop();
  } catch {
    /* already stopping/stopped */
  }
}
