import { VetBackendConnector } from "./connector";
import { powerSync } from "./database";

/**
 * One shared connector — re-used on every reconnect so SDK retries hit the same instance.
 */
const connector = new VetBackendConnector();

/**
 * Connect the on-device SQLite to the PowerSync stream, scoped to whoever owns the
 * currently-presented access token. Idempotent: calling twice while already connected is a
 * no-op the SDK shrugs off. Bound to the auth store: `setSessionFromLogin` calls this after
 * tokens land, and `restore()` calls it when a stored session is rehydrated on cold start.
 *
 * Every stream in `vet-backend/powersync/sync-rules.yaml` is `auto_subscribe: true`, so the
 * SDK's connect default (`includeDefaultStreams: true`) brings them down without any
 * explicit `syncStream(name).subscribe()` calls. An earlier subscription loop was needed
 * when the backend ran legacy `bucket_definitions:` (PowerSync 1.10) — that legacy mode is
 * gone now and the loop became a no-op against the new streams shape.
 */
export async function connectPowerSync(): Promise<void> {
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
