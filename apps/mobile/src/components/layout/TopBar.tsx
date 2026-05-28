import { Pressable, Text, View } from "react-native";

import { Forward, More } from "../icons";

/**
 * The design's `.sv-topbar` — a 3-column header with a centred title. In RTL the
 * "back" affordance uses the chevron pointing → (which visually means "back" in
 * a right-to-left context). `solid` swaps the transparent style for an opaque
 * paper background with a hairline border (matches `.sv-topbar.solid`).
 *
 * The `right` slot defaults to the design's "more" 3-dot menu; pass `null` to
 * suppress it, or any React node to swap it (e.g., a bell + lang toggle row).
 */
interface TopBarProps {
  title?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  solid?: boolean;
}

export function TopBar({ title, onBack, right, solid = true }: TopBarProps) {
  return (
    <View
      className={`flex-row items-center gap-3 px-5 pb-3.5 pt-2 ${
        solid ? "bg-paper border-b border-ink-100" : "bg-transparent"
      }`}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          className="h-9 w-9 items-center justify-center"
        >
          <Forward size={22} color="#223D69" />
        </Pressable>
      ) : (
        <View className="w-9" />
      )}
      <Text
        className="text-navy-900 flex-1 text-center text-[18px] font-tajawal-extrabold"
        numberOfLines={1}
      >
        {title}
      </Text>
      {right !== undefined ? (
        right
      ) : (
        <Pressable className="h-9 w-9 items-center justify-center" accessibilityRole="button">
          <More size={22} color="#223D69" />
        </Pressable>
      )}
    </View>
  );
}
