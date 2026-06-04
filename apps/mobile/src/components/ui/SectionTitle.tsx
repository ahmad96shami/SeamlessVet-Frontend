import { Pressable, Text, View } from "react-native";

/**
 * The design's section heading — a 15/800 navy title with an optional teal
 * action link on the opposite side ("جدول اليوم — عرض الكل"). Owns the standard
 * vertical rhythm between a screen's sections.
 */
interface SectionTitleProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionTitle({ title, actionLabel, onAction }: SectionTitleProps) {
  return (
    <View className="mb-2.5 mt-[18px] flex-row items-center justify-between">
      <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text className="text-teal-600 text-[13px] font-tajawal-bold">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
