import { Pressable, Text, View } from "react-native";

/**
 * The design's segmented control — an ink-100 track of equal-width pill options
 * with a navy active chip (inventory's مخزوني / منخفض / الحركات switcher).
 *
 * Distinct from a `Chip` row: segments fill the track and exactly one is active.
 */
interface SegmentedTabsProps<K extends string> {
  options: ReadonlyArray<{ key: K; label: string }>;
  value: K;
  onChange: (key: K) => void;
}

export function SegmentedTabs<K extends string>({
  options,
  value,
  onChange,
}: SegmentedTabsProps<K>) {
  return (
    <View className="bg-ink-100 flex-row gap-1 rounded-chip p-1">
      {options.map(({ key, label }) => {
        const active = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`flex-1 items-center justify-center rounded-pill py-2.5 ${
              active ? "bg-navy-900" : ""
            }`}
          >
            <Text
              className={`text-[13px] font-tajawal-bold ${active ? "text-paper" : "text-ink-700"}`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
