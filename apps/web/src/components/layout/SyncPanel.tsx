import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { QueuedRequest, QueuedRequestStatus } from "@vet/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { offlineQueue } from "@/services/offlineQueue";
import { discardItem, retryAll, retryItem, syncNow } from "@/services/syncEngine";
import { useSyncStore } from "@/stores/syncStore";

const STATUS_META: Record<QueuedRequestStatus, { i18n: string; variant: "secondary" | "warning" | "destructive" }> = {
  pending: { i18n: "sync.pendingItem", variant: "secondary" },
  failed: { i18n: "sync.failedItem", variant: "warning" },
  conflict: { i18n: "sync.conflictItem", variant: "destructive" },
};

/** Reload the queue whenever it changes while the panel is open (counts/syncing are the signal). */
function useQueuedRequests(open: boolean): QueuedRequest[] {
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const conflictCount = useSyncStore((s) => s.conflictCount);
  const syncing = useSyncStore((s) => s.syncing);
  const [items, setItems] = useState<QueuedRequest[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void offlineQueue.all().then((rows) => {
      if (active) setItems(rows);
    });
    return () => {
      active = false;
    };
  }, [open, pendingCount, conflictCount, syncing]);

  return items;
}

/**
 * The offline write-queue review panel (PRD §8.4): every unsynced operation is listed with its
 * state and last error, and conflicts (server rejections) can be retried or discarded — so nothing
 * is ever lost silently.
 */
export function SyncPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const items = useQueuedRequests(open);
  const online = useSyncStore((s) => s.online);
  const conflictCount = useSyncStore((s) => s.conflictCount);

  return (
    <Dialog open={open} onClose={onClose} title={t("sync.panelTitle")}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" disabled={!online} onClick={() => void syncNow()}>
            <Icon.send className="size-4" />
            {t("sync.syncNow")}
          </Button>
          {conflictCount > 0 ? (
            <Button variant="ghost" size="sm" disabled={!online} onClick={() => void retryAll()}>
              {t("sync.retryAll")}
            </Button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("sync.panelEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((req) => {
              const meta = STATUS_META[req.status];
              const actionable = req.status === "conflict" || req.status === "failed";
              return (
                <li key={req.id} className="rounded-xl border border-border bg-card/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-navy-900">{t(req.label)}</span>
                        <Badge variant={meta.variant}>{t(meta.i18n)}</Badge>
                      </div>
                      {req.lastError ? (
                        <p className="truncate text-xs text-muted-foreground" title={req.lastError}>
                          {req.lastCode ? `${req.lastCode} — ` : ""}
                          {req.lastError}
                        </p>
                      ) : null}
                      {req.attempts > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {t("sync.attempts", { count: req.attempts })}
                        </p>
                      ) : null}
                    </div>
                    {actionable ? (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!online}
                          aria-label={t("sync.retry")}
                          title={t("sync.retry")}
                          onClick={() => void retryItem(req.id)}
                        >
                          <Icon.spinner className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("sync.discard")}
                          title={t("sync.discard")}
                          onClick={() => {
                            if (window.confirm(t("sync.discardConfirm"))) void discardItem(req.id);
                          }}
                        >
                          <Icon.trash className="size-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
