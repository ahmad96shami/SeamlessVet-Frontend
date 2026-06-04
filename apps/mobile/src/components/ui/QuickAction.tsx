import { Pressable, Text, View } from "react-native";

import { shadow } from "@/theme";

/**
 * The design's home quick-action tile — a square card with a small icon tile and
 * a two-line 12/800 label. `primary` is the navy hero tile (the screen's main
 * CTA, e.g. "زيارة جديدة") with a translucent white icon square.
 *
 * Width comes from the parent (home's QuickActionsGrid sizes tiles to the
 * available space) — the tile itself only fixes its min height.
 *
 * Pick the icon colour to match: white on `primary`, teal-600 otherwise.
 */
interface QuickActionProps {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
}

export function QuickAction({ label, icon, onPress, primary }: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={`rounded-card min-h-[116px] items-center justify-center gap-2 p-3.5 active:opacity-90 ${
        primary ? "bg-navy-900" : "bg-paper"
      }`}
      // Token style, not the `shadow-card` class (css-interop late-upgrade — see Card.tsx).
      style={shadow.card}
    >
      <View
        className={`h-9 w-9 items-center justify-center rounded-chip ${
          primary ? "bg-white/15" : "bg-teal-50"
        }`}
      >
        {icon}
      </View>
      <Text
        numberOfLines={2}
        className={`text-center text-[12px] leading-4 font-tajawal-extrabold ${
          primary ? "text-paper" : "text-navy-900"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
