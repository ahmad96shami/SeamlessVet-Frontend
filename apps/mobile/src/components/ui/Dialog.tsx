import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { useDialogStore } from "@/stores/dialogStore";
import { shadow } from "@/theme";

import { Button } from "./Button";

/**
 * The design-system dialog — renders `dialog.alert` / `dialog.confirm` /
 * `dialog.choose` requests (see `stores/dialogStore`) identically on iOS and
 * Android instead of the platforms' native Alert chrome.
 *
 * Mounted ONCE in the root layout. Same two-layer animation as `Sheet`
 * (backdrop fades in place; the card pops 0.92→1, Reanimated on the UI
 * thread), and the exit animation settles the request before the Modal
 * unmounts. Backdrop tap and hardware back dismiss — resolving `false` for
 * confirms.
 */
export function DialogHost() {
  const { t } = useTranslation();
  const head = useDialogStore((s) => s.queue[0]);
  const settle = useDialogStore((s) => s.settle);
  const [closing, setClosing] = useState(false);
  const progress = useSharedValue(0);

  // Animate in for every new queue head (incl. the next queued request).
  useEffect(() => {
    if (!head) return;
    setClosing(false);
    progress.value = 0;
    progress.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
  }, [head?.id, progress]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
  }));

  if (!head) return null;

  const finish = (result: boolean | string) => {
    if (closing) return;
    setClosing(true);
    const id = head.id;
    progress.value = withTiming(
      0,
      { duration: 150, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(settle)(id, result);
      },
    );
  };

  const confirmLabel = head.confirmLabel ?? t("actions.ok");

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => finish(false)}>
      <View className="flex-1 items-center justify-center px-7">
        {/* Backdrop layer — fades, never moves (see Sheet). */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable className="bg-ink-900/50 flex-1" onPress={() => finish(false)} />
        </Animated.View>
        {/* Card layer — Animated.Views stay className-free (style-only). */}
        <Animated.View style={[{ width: "100%" }, cardStyle, shadow.pop]}>
          <View className="bg-paper rounded-card p-5">
            <Text className="text-navy-900 text-[17px] font-tajawal-extrabold">{head.title}</Text>
            {head.message ? (
              <Text className="text-ink-500 mt-1.5 text-[13px] leading-5 font-tajawal">
                {head.message}
              </Text>
            ) : null}
            {head.kind === "choose" ? (
              <View className="mt-5 gap-2.5">
                {head.options?.map((o) => (
                  <Button
                    key={o.value}
                    label={o.label}
                    variant="soft"
                    disabled={closing}
                    onPress={() => finish(o.value)}
                  />
                ))}
                <Button
                  label={head.cancelLabel ?? t("actions.cancel")}
                  variant="ghost"
                  disabled={closing}
                  onPress={() => finish(false)}
                />
              </View>
            ) : head.kind === "confirm" ? (
              <View className="mt-5 flex-row gap-2.5">
                {/* RTL flex-row: cancel lands on the right, confirm at the end (left). */}
                <View className="flex-1">
                  <Button
                    label={head.cancelLabel ?? t("actions.cancel")}
                    variant="soft"
                    disabled={closing}
                    onPress={() => finish(false)}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label={confirmLabel}
                    variant={head.destructive ? "destructive" : "primary"}
                    disabled={closing}
                    onPress={() => finish(true)}
                  />
                </View>
              </View>
            ) : (
              <View className="mt-5">
                <Button label={confirmLabel} disabled={closing} onPress={() => finish(true)} />
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
