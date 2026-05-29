import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { QueuedRequest, QueuedRequestStatus } from "@vet/shared";

import { Button, Card, Divider, Pill } from "@/components/ui";
import { offlineQueue } from "@/services/offlineQueue";
import {
  type PowerSyncConflict,
  listPowerSyncConflicts,
} from "@/services/powerSyncConflicts";
import {
  discardItem,
  dismissPowerSyncConflict,
  retryAll,
  retryItem,
  syncNow,
} from "@/services/syncEngine";
import { useSyncStore } from "@/stores/syncStore";

import { Check, Send, Spinner, Trash } from "./icons";

const STATUS_TONE: Record<QueuedRequestStatus, "neutral" | "amber" | "red"> = {
  pending: "neutral",
  failed: "amber",
  conflict: "red",
};
const STATUS_I18N: Record<QueuedRequestStatus, string> = {
  pending: "sync.pendingItem",
  failed: "sync.failedItem",
  conflict: "sync.conflictItem",
};

/** Reload both queues whenever they change while the sheet is open (counts/syncing are the signal). */
function useReviewData(open: boolean): { rest: QueuedRequest[]; ps: PowerSyncConflict[] } {
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const conflictCount = useSyncStore((s) => s.conflictCount);
  const psConflictCount = useSyncStore((s) => s.psConflictCount);
  const syncing = useSyncStore((s) => s.syncing);
  const [rest, setRest] = useState<QueuedRequest[]>([]);
  const [ps, setPs] = useState<PowerSyncConflict[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void offlineQueue.all().then((rows) => {
      if (active) setRest(rows);
    });
    setPs(listPowerSyncConflicts());
    return () => {
      active = false;
    };
  }, [open, pendingCount, conflictCount, psConflictCount, syncing]);

  return { rest, ps };
}

/**
 * The offline-write review sheet (PRD §8.4 — no silent loss). It unifies the hybrid write model's
 * two upload paths: the shared REST-intent queue (retryable: "retry" / "discard") and the parked
 * PowerSync server-wins rejections (acknowledge-only: "dismiss"). Reached by tapping the sync pill.
 */
export function SyncReviewSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { rest, ps } = useReviewData(open);
  const online = useSyncStore((s) => s.online);
  const conflictCount = useSyncStore((s) => s.conflictCount);
  const isEmpty = rest.length === 0 && ps.length === 0;

  const confirmDiscard = (id: string) =>
    Alert.alert(t("sync.discard"), t("sync.discardConfirm"), [
      { text: t("actions.cancel"), style: "cancel" },
      { text: t("sync.discard"), style: "destructive", onPress: () => void discardItem(id) },
    ]);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-[rgba(8,16,30,0.45)]" onPress={onClose}>
        {/* stop backdrop taps from closing when interacting with the sheet body */}
        <Pressable className="bg-paper rounded-t-card max-h-[80%] px-5 pb-8 pt-4" onPress={() => {}}>
          <View className="flex-row items-center justify-between pb-1">
            <Text className="text-navy-900 text-[17px] font-tajawal-extrabold">
              {t("sync.panelTitle")}
            </Text>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
              <Text className="text-teal-700 text-[14px] font-tajawal-bold">{t("actions.close")}</Text>
            </Pressable>
          </View>
          <Text className="text-ink-500 pb-3 text-[12px] font-tajawal">{t("sync.reviewHint")}</Text>

          <View className="flex-row gap-2 pb-3">
            <Button
              label={t("sync.syncNow")}
              variant="soft"
              size="sm"
              leadingIcon={<Send size={14} color="#223D69" />}
              disabled={!online}
              onPress={() => void syncNow()}
            />
            {conflictCount > 0 ? (
              <Button
                label={t("sync.retryAll")}
                variant="soft"
                size="sm"
                disabled={!online}
                onPress={() => void retryAll()}
              />
            ) : null}
          </View>

          {isEmpty ? (
            <Text className="text-ink-500 py-8 text-center text-[13px] font-tajawal">
              {t("sync.panelEmpty")}
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} className="grow-0">
              {rest.length > 0 ? (
                <View className="gap-2 pb-2">
                  <SectionLabel text={t("sync.restSection")} />
                  {rest.map((req) => (
                    <RestRow
                      key={req.id}
                      req={req}
                      online={online}
                      onRetry={() => void retryItem(req.id)}
                      onDiscard={() => confirmDiscard(req.id)}
                    />
                  ))}
                </View>
              ) : null}

              {rest.length > 0 && ps.length > 0 ? <Divider /> : null}

              {ps.length > 0 ? (
                <View className="gap-2 pt-2">
                  <SectionLabel text={t("sync.psSection")} />
                  {ps.map((c) => (
                    <PsRow key={c.id} conflict={c} onDismiss={() => void dismissPowerSyncConflict(c.id)} />
                  ))}
                </View>
              ) : null}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <Text className="text-ink-500 text-[11px] font-tajawal-bold">{text}</Text>;
}

function RestRow({
  req,
  online,
  onRetry,
  onDiscard,
}: {
  req: QueuedRequest;
  online: boolean;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const { t } = useTranslation();
  const actionable = req.status === "conflict" || req.status === "failed";
  return (
    <Card flat className="gap-1.5 p-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-navy-900 text-[14px] font-tajawal-bold">{t(req.label)}</Text>
            <Pill tone={STATUS_TONE[req.status]} label={t(STATUS_I18N[req.status])} />
          </View>
          {req.lastError ? (
            <Text className="text-ink-500 text-[12px] font-tajawal" numberOfLines={2}>
              {req.lastCode ? `${req.lastCode} — ` : ""}
              {req.lastError}
            </Text>
          ) : null}
          {req.attempts > 0 ? (
            <Text className="text-ink-400 text-[11px] font-tajawal">
              {t("sync.attempts", { count: req.attempts })}
            </Text>
          ) : null}
        </View>
        {actionable ? (
          <View className="flex-row gap-1">
            <IconBtn label={t("sync.retry")} disabled={!online} onPress={onRetry}>
              <Spinner size={16} color={online ? "#0B6573" : "#9AA6B8"} />
            </IconBtn>
            <IconBtn label={t("sync.discard")} onPress={onDiscard}>
              <Trash size={16} color="#B42318" />
            </IconBtn>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function PsRow({ conflict, onDismiss }: { conflict: PowerSyncConflict; onDismiss: () => void }) {
  const { t } = useTranslation();
  return (
    <Card flat className="gap-1.5 p-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-navy-900 text-[14px] font-tajawal-bold">
              {t(`sync.table.${conflict.table}`, { defaultValue: conflict.table })}
            </Text>
            <Pill tone="amber" label={t("sync.serverWins")} />
          </View>
          <Text className="text-ink-500 text-[12px] font-tajawal" numberOfLines={2}>
            {conflict.code ? `${conflict.code} — ` : ""}
            {conflict.message}
          </Text>
          <Text className="text-ink-400 text-[11px] font-tajawal">{t("sync.serverWinsHint")}</Text>
        </View>
        <IconBtn label={t("sync.dismiss")} onPress={onDismiss}>
          <Check size={16} color="#0B6573" />
        </IconBtn>
      </View>
    </Card>
  );
}

function IconBtn({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className={`border-ink-100 bg-paper h-9 w-9 items-center justify-center rounded-chip border ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {children}
    </Pressable>
  );
}
