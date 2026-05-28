import { PowerSyncDatabase } from "@powersync/react-native";

import { AppSchema } from "./schema";

/**
 * Singleton on-device SQLite database. Constructed once at module load; the file is created
 * the first time it's opened. We do NOT call {@link PowerSyncDatabase.connect} here — that
 * happens inside the auth lifecycle (`sync/lifecycle.ts`) once a field doctor signs in.
 *
 * The dbFilename is fixed: there's exactly one doctor per device and a logout wipes the
 * contents via `disconnectAndClear`, so a per-user filename would be churn without payoff.
 */
export const powerSync = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: "vet.field.db" },
});
