import { useState } from "react";
import { useTranslation } from "react-i18next";

import { SyncPanel } from "@/components/layout/SyncPanel";
import { cn } from "@/lib/utils";
import { deriveStatus, useSyncStore, type SyncStatus } from "@/stores/syncStore";

/** status → the existing `.sync-dot` tone (online = base green). */
const DOT_CLASS: Record<SyncStatus, string> = {
  online: "",
  syncing: "amber",
  offline: "gray",
  conflict: "red",
};

/**
 * The shell's live sync pill: a coloured dot reflecting connectivity/queue state with a pending
 * badge, opening the review panel on click. Replaces the W0 static placeholder dot.
 */
export function SyncIndicator() {
  const { t } = useTranslation();
  const online = useSyncStore((s) => s.online);
  const syncing = useSyncStore((s) => s.syncing);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const conflictCount = useSyncStore((s) => s.conflictCount);
  const [open, setOpen] = useState(false);

  const status = deriveStatus({ online, syncing, pendingCount, conflictCount });
  const title = t(`sync.${status}`, { count: pendingCount });

  return (
    <>
      <button className="icon-pill" title={title} aria-label={title} onClick={() => setOpen(true)}>
        <span className={cn("sync-dot", DOT_CLASS[status])} />
        {pendingCount > 0 ? (
          <span className={cn("badge", conflictCount === 0 && "neutral")}>{pendingCount}</span>
        ) : null}
      </button>
      <SyncPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
