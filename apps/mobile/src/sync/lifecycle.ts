import { VetBackendConnector } from "./connector";
import { powerSync } from "./database";

/**
 * One shared connector — re-used on every reconnect so SDK retries hit the same instance.
 */
const connector = new VetBackendConnector();

/**
 * Bucket names declared in the backend's `powersync/sync-rules.yaml`. PowerSync SDK 1.35+
 * (Sync Streams alpha) doesn't auto-subscribe to legacy `bucket_definitions:` — only to
 * `streams:` entries marked `auto_subscribe: true`. Without an explicit subscription, the
 * Rust sync client connects but no data ever streams down: the reference catalog
 * (products/services), the doctor's customers, contracts, visits and field inventory all
 * stay empty.
 *
 * Subscribing here keeps the YAML in its current shape (the existing M14 sync rules) and
 * survives reconnect: subscriptions are persisted in `ps_stream_subscriptions` with a TTL.
 * We use a long TTL (~365 days) so the user's session never loses a stream while signed in;
 * logout's {@link disconnectAndWipePowerSync} drops the whole local DB, which clears
 * subscriptions cleanly.
 */
const BUCKETS = [
  "reference",
  "doctor",
  "by_customer",
  "by_visit",
  "by_field_inventory",
  "by_contract",
] as const;

const STREAM_TTL_SECONDS = 365 * 24 * 60 * 60;

/**
 * Connect the on-device SQLite to the PowerSync stream, scoped to whoever owns the
 * currently-presented access token. Idempotent: calling twice while already connected is a
 * no-op the SDK shrugs off. Bound to the auth store: `setSessionFromLogin` calls this after
 * tokens land, and `restore()` calls it when a stored session is rehydrated on cold start.
 */
export async function connectPowerSync(): Promise<void> {
  // Subscribe FIRST, then connect — the SDK reads the persisted subscription set when it
  // opens the sync stream, so registering subscriptions after `connect()` lands them in
  // ps_stream_subscriptions but they stay `active=0` until the next connection cycle.
  // Subscribing before connect (or on every connect call, with the connector idempotent)
  // ensures the very first stream request includes the buckets we want.
  await Promise.all(
    BUCKETS.map(async (name) => {
      try {
        await powerSync.syncStream(name).subscribe({ ttl: STREAM_TTL_SECONDS });
      } catch (err) {
        console.warn(`[powersync] failed to subscribe to '${name}'`, err);
      }
    }),
  );

  await powerSync.connect(connector);
}

/**
 * Disconnect AND wipe every synced row from on-device SQLite. PRD §8.8: logout must leave
 * no field data on the device — another doctor signing in on the same hardware must not
 * see the prior doctor's customers, inventory, or visits. The SDK's `disconnectAndClear`
 * keeps the database itself open (so the next login can reconnect without reopening),
 * but every table is emptied.
 */
export async function disconnectAndWipePowerSync(): Promise<void> {
  await powerSync.disconnectAndClear();
}
