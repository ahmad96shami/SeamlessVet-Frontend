import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { QueuedRequest, QueuedRequestStatus } from "@vet/shared";

import { Button, Card, Pill, Sheet } from "@/components/ui";
import {
  type AttachmentOutboxItem,
  listAttachmentOutbox,
} from "@/services/attachmentOutbox";
import { discardAttachment, retryAttachment } from "@/services/attachmentUploadEngine";
import { offlineQueue } from "@/services/offlineQueue";
import { type PowerSyncConflict, listPowerSyncConflicts } from "@/services/powerSyncConflicts";
import {
  discardItem,
  dismissPowerSyncConflict,
  retryAll,
  retryItem,
  syncNow,
} from "@/services/syncEngine";
import { dialog } from "@/stores/dialogStore";
import { useSyncStore } from "@/stores/syncStore";

import { Check, Send, Spinner, Trash } from "./icons";
import { colors } from "@/theme";

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

/** Reload all three queues whenever they change while the sheet is open (counts/syncing are signals). */
function useReviewData(open: boolean): {
  rest: QueuedRequest[];
  att: AttachmentOutboxItem[];
  ps: PowerSyncConflict[];
} {
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const conflictCount = useSyncStore((s) => s.conflictCount);
  const psConflictCount = useSyncStore((s) => s.psConflictCount);
  const attPendingCount = useSyncStore((s) => s.attPendingCount);
  const attConflictCount = useSyncStore((s) => s.attConflictCount);
  const syncing = useSyncStore((s) => s.syncing);
  const [rest, setRest] = useState<QueuedRequest[]>([]);
  const [att, setAtt] = useState<AttachmentOutboxItem[]>([]);
  const [ps, setPs] = useState<PowerSyncConflict[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void offlineQueue.all().then((rows) => {
      if (active) setRest(rows);
    });
    setAtt(listAttachmentOutbox());
    setPs(listPowerSyncConflicts());
    return () => {
      active = false;
    };
  }, [open, pendingCount, conflictCount, psConflictCount, attPendingCount, attConflictCount, syncing]);

  return { rest, att, ps };
}

/**
 * The offline-write review sheet (PRD §8.4 — no silent loss). It unifies the hybrid write model's
 * three upload paths: the shared REST-intent queue + the attachment outbox (both retry / discard)
 * and the parked PowerSync server-wins rejections (acknowledge-only: "dismiss"). Reached by tapping
 * the sync pill.
 */
export function SyncReviewSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { rest, att, ps } = useReviewData(open);
  const online = useSyncStore((s) => s.online);
  const conflictCount = useSyncStore((s) => s.conflictCount);
  const isEmpty = rest.length === 0 && att.length === 0 && ps.length === 0;

  const confirmDiscard = (onConfirm: () => void) =>
    void dialog
      .confirm({
        title: t("sync.discard"),
        message: t("sync.discardConfirm"),
        confirmLabel: t("sync.discard"),
        destructive: true,
      })
      .then((ok) => {
        if (ok) onConfirm();
      });

  return (
    <Sheet open={open} onClose={onClose}>
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
          leadingIcon={<Send size={14} color={colors.navy[900]} />}
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
            <Section title={t("sync.restSection")}>
              {rest.map((req) => (
                <RestRow
                  key={req.id}
                  title={t(req.label)}
                  status={req.status}
                  code={req.lastCode}
                  error={req.lastError}
                  attempts={req.attempts}
                  online={online}
                  onRetry={() => void retryItem(req.id)}
                  onDiscard={() => confirmDiscard(() => void discardItem(req.id))}
                />
              ))}
            </Section>
          ) : null}

          {att.length > 0 ? (
            <Section title={t("sync.attachmentsSection")}>
              {att.map((item) => (
                <RestRow
                  key={item.id}
                  title={item.title || t("sync.label.attachment")}
                  status={item.status}
                  code={item.lastCode}
                  error={item.lastError}
                  attempts={item.attempts}
                  online={online}
                  onRetry={() => void retryAttachment(item.id)}
                  onDiscard={() => confirmDiscard(() => discardAttachment(item.id))}
                />
              ))}
            </Section>
          ) : null}

          {ps.length > 0 ? (
            <Section title={t("sync.psSection")}>
              {ps.map((c) => (
                <PsRow key={c.id} conflict={c} onDismiss={() => void dismissPowerSyncConflict(c.id)} />
              ))}
            </Section>
          ) : null}
        </ScrollView>
      )}
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2 pt-3">
      <Text className="text-ink-500 text-[11px] font-tajawal-bold">{title}</Text>
      {children}
    </View>
  );
}

/** A retryable/discardable queue item (shared by the REST queue + the attachment outbox). */
function RestRow({
  title,
  status,
  code,
  error,
  attempts,
  online,
  onRetry,
  onDiscard,
}: {
  title: string;
  status: QueuedRequestStatus;
  code?: string;
  error?: string;
  attempts: number;
  online: boolean;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const { t } = useTranslation();
  const actionable = status === "conflict" || status === "failed";
  return (
    <Card flat className="gap-1.5 p-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-navy-900 text-[14px] font-tajawal-bold">{title}</Text>
            <Pill tone={STATUS_TONE[status]} label={t(STATUS_I18N[status])} />
          </View>
          {error ? (
            <Text className="text-ink-500 text-[12px] font-tajawal" numberOfLines={2}>
              {code ? `${code} — ` : ""}
              {error}
            </Text>
          ) : null}
          {attempts > 0 ? (
            <Text className="text-ink-400 text-[11px] font-tajawal">
              {t("sync.attempts", { count: attempts })}
            </Text>
          ) : null}
        </View>
        {actionable ? (
          <View className="flex-row gap-1">
            <IconBtn label={t("sync.retry")} disabled={!online} onPress={onRetry}>
              <Spinner size={16} color={online ? colors.teal[700] : colors.ink[400]} />
            </IconBtn>
            <IconBtn label={t("sync.discard")} onPress={onDiscard}>
              <Trash size={16} color={colors.rose.ink} />
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
          <Check size={16} color={colors.teal[700]} />
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
