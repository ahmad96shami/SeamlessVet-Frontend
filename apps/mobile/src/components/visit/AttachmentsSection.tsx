import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image as RNImage,
  Linking,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { formatDate, getAttachment } from "@vet/shared";

import { Camera, Image as ImageIcon, Paper, Search } from "@/components/icons";
import { Card, Pill } from "@/components/ui";
import { apiClient } from "@/services/apiClient";
import {
  type AttachmentOutboxItem,
  enqueueAttachment,
  listAttachmentOutboxForVisit,
} from "@/services/attachmentOutbox";
import { drainAttachmentOutbox, refreshAttachmentCounts } from "@/services/attachmentUploadEngine";
import { useQuery } from "@/sync/hooks";
import type { AttachmentRow } from "@/sync/types";
import { useSyncStore } from "@/stores/syncStore";

interface AttachmentsSectionProps {
  visitId: string;
  isTerminal: boolean;
}

type Tone = "neutral" | "teal" | "amber" | "green" | "red";

/**
 * Visit attachments on the field app (Mo6.4 — PRD §5.2-F). Two row sources are merged:
 *   • **synced** rows from local SQLite (`attachments`) — uploaded earlier or from the web;
 *   • **outbox** rows captured on this device but not yet uploaded (the Mo6.3 local-URI outbox).
 *
 * Capture (camera / gallery) writes the file URI to the outbox and kicks the upload engine; the
 * bytes never touch SQLite (PRD §8.8). Viewing an uploaded attachment fetches a fresh short-lived
 * signed URL (online only) — photos render in-app, PDFs open in the system viewer; a
 * just-captured outbox photo previews straight from its local URI, even offline.
 */
export function AttachmentsSection({ visitId, isTerminal }: AttachmentsSectionProps) {
  const { t, i18n } = useTranslation();
  const online = useSyncStore((s) => s.online);
  const attPending = useSyncStore((s) => s.attPendingCount);
  const attConflict = useSyncStore((s) => s.attConflictCount);

  const { data: syncedRows } = useQuery<AttachmentRow>(
    `SELECT * FROM attachments WHERE visit_id = ? ORDER BY created_at DESC`,
    [visitId],
  );

  // The outbox is MMKV-backed (not a watched SQLite query), so re-read it whenever the unified
  // attachment counts move — that's the signal a capture / upload / conflict just changed it.
  const [outbox, setOutbox] = useState<AttachmentOutboxItem[]>([]);
  useEffect(() => {
    setOutbox(listAttachmentOutboxForVisit(visitId));
  }, [visitId, attPending, attConflict]);

  const [busyView, setBusyView] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ uri: string; title: string } | null>(null);

  const synced = syncedRows ?? [];
  const syncedIds = new Set(synced.map((r) => r.id));
  const pendingOnly = outbox.filter((o) => !syncedIds.has(o.id)); // drop ones already streamed back

  const capture = async (source: "camera" | "gallery") => {
    const perm =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t("visits.files.permissionTitle"), t("visits.files.permissionBody"));
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    enqueueAttachment({
      visitId,
      localUri: asset.uri,
      fileType: "photo",
      contentType: asset.mimeType ?? "image/jpeg",
      title: asset.fileName ?? undefined,
    });
    refreshAttachmentCounts();
    void drainAttachmentOutbox(); // upload now if online; otherwise it waits for reconnect
  };

  const onAdd = () =>
    Alert.alert(t("visits.files.add"), undefined, [
      { text: t("visits.files.camera"), onPress: () => void capture("camera") },
      { text: t("visits.files.gallery"), onPress: () => void capture("gallery") },
      { text: t("actions.cancel"), style: "cancel" },
    ]);

  const viewSynced = async (row: AttachmentRow) => {
    if (row.upload_status !== "uploaded") {
      Alert.alert(t("visits.files.title"), t("visits.files.pendingHint"));
      return;
    }
    if (!online) {
      Alert.alert(t("visits.files.title"), t("visits.files.viewOnlineOnly"));
      return;
    }
    setBusyView(row.id);
    try {
      const att = await getAttachment(apiClient, row.id);
      const url = att.downloadUrl;
      if (!url) {
        Alert.alert(t("visits.files.title"), t("visits.files.pendingHint"));
        return;
      }
      if (row.file_type === "pdf") await Linking.openURL(url);
      else setViewer({ uri: url, title: row.title ?? t("attachmentType.photo") });
    } catch {
      Alert.alert(t("visits.files.title"), t("visits.files.viewOnlineOnly"));
    } finally {
      setBusyView(null);
    }
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
          {t("visits.files.title")}
        </Text>
        {!isTerminal ? (
          <Pressable
            onPress={onAdd}
            className="bg-navy-900 active:bg-navy-800 flex-row items-center gap-1.5 rounded-pill px-3 py-1.5"
          >
            <Camera size={14} color="#FFFFFF" />
            <Text className="text-paper text-[12px] font-tajawal-bold">{t("visits.files.add")}</Text>
          </Pressable>
        ) : null}
      </View>

      {synced.length === 0 && pendingOnly.length === 0 ? (
        <Card flat className="p-4">
          <Text className="text-ink-500 text-center text-[13px] font-tajawal">
            {t("visits.files.empty")}
          </Text>
        </Card>
      ) : (
        <View className="gap-2">
          {pendingOnly.map((o) => (
            <Row
              key={o.id}
              icon={<ImageIcon size={18} color="#0F7A8A" />}
              title={o.title || t(`attachmentType.${o.fileType}`)}
              pill={outboxPill(o.status)}
              viewLabel={t("visits.files.view")}
              onView={() => setViewer({ uri: o.localUri, title: o.title || t("attachmentType.photo") })}
            />
          ))}
          {synced.map((r) => (
            <Row
              key={r.id}
              icon={
                r.file_type === "pdf" ? (
                  <Paper size={18} color="#0F7A8A" />
                ) : (
                  <ImageIcon size={18} color="#0F7A8A" />
                )
              }
              title={r.title || t(`attachmentType.${r.file_type}`, { defaultValue: r.file_type })}
              subtitle={r.doc_date ? formatDate(r.doc_date, i18n.resolvedLanguage) : undefined}
              pill={syncedPill(r.upload_status)}
              viewLabel={t("visits.files.view")}
              viewDisabled={r.upload_status !== "uploaded"}
              busy={busyView === r.id}
              onView={() => void viewSynced(r)}
            />
          ))}
        </View>
      )}

      <ImageViewer viewer={viewer} onClose={() => setViewer(null)} closeLabel={t("actions.close")} />
    </View>
  );

  function outboxPill(status: AttachmentOutboxItem["status"]): { tone: Tone; label: string } {
    if (status === "conflict") return { tone: "red", label: t("visits.files.rejectedUpload") };
    if (status === "failed") return { tone: "amber", label: t("visits.files.failedUpload") };
    return { tone: "amber", label: t("visits.files.pendingUpload") };
  }
  function syncedPill(status: string): { tone: Tone; label: string } {
    if (status === "uploaded") return { tone: "green", label: t("uploadStatus.uploaded") };
    if (status === "failed") return { tone: "red", label: t("uploadStatus.failed") };
    return { tone: "neutral", label: t("uploadStatus.pending") };
  }
}

function Row({
  icon,
  title,
  subtitle,
  pill,
  viewLabel,
  viewDisabled,
  busy,
  onView,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  pill: { tone: Tone; label: string };
  viewLabel: string;
  viewDisabled?: boolean;
  busy?: boolean;
  onView: () => void;
}) {
  return (
    <Card className="flex-row items-center gap-3 p-3">
      <View className="bg-teal-50 h-10 w-10 items-center justify-center rounded-card">{icon}</View>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
          {title}
        </Text>
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Pill tone={pill.tone} label={pill.label} />
          {subtitle ? <Text className="text-ink-500 text-[11px] font-tajawal">{subtitle}</Text> : null}
        </View>
      </View>
      <Pressable
        onPress={onView}
        disabled={viewDisabled || busy}
        accessibilityRole="button"
        accessibilityLabel={viewLabel}
        hitSlop={6}
        className={`border-ink-100 bg-paper h-9 w-9 items-center justify-center rounded-chip border ${
          viewDisabled ? "opacity-50" : ""
        }`}
      >
        {busy ? <ActivityIndicator size="small" color="#0B6573" /> : <Search size={16} color="#0B6573" />}
      </Pressable>
    </Card>
  );
}

/** Full-screen image preview (a synced signed URL or a local-URI outbox capture). */
function ImageViewer({
  viewer,
  onClose,
  closeLabel,
}: {
  viewer: { uri: string; title: string } | null;
  onClose: () => void;
  closeLabel: string;
}) {
  const [loading, setLoading] = useState(true);
  return (
    <Modal visible={viewer !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-[rgba(8,16,30,0.95)]">
        <View className="flex-row items-center justify-between px-5 pb-3 pt-12">
          <Text className="text-paper flex-1 text-[14px] font-tajawal-bold" numberOfLines={1}>
            {viewer?.title ?? ""}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
            <Text className="text-[14px] font-tajawal-bold" style={{ color: "#5EE6D0" }}>
              {closeLabel}
            </Text>
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-3 pb-10">
          {viewer ? (
            <RNImage
              source={{ uri: viewer.uri }}
              resizeMode="contain"
              className="h-full w-full"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
          ) : null}
          {loading && viewer ? (
            <View className="absolute">
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
