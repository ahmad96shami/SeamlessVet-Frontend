/**
 * Local-first read layer. Re-exports the SDK's watched-query hook + status hook under
 * a stable in-app path so feature milestones (Mo2 customer picker, Mo3 stock list, …)
 * import from one place and the SDK choice stays swappable.
 *
 * Usage:
 *   const { data: visits } = useQuery<VisitRow>(
 *     `SELECT * FROM visits WHERE customer_id = ? ORDER BY started_at DESC`,
 *     [customerId],
 *   );
 *
 * `useQuery` subscribes to the underlying SQLite tables, so any local write (or a row
 * arriving from the sync stream) re-emits without manual cache invalidation — that's the
 * "everything downstream reads local-first" piece of Mo1's goal.
 */
export { useQuery, useStatus } from "@powersync/react";
