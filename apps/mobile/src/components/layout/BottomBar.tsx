import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme";

import { Box, Calendar, Home, User } from "../icons";

/**
 * The design's `.tabbar` — a 4-column primary navigation pinned to the bottom.
 * Each tab is icon + label; the active tab simply tints both navy (the MoD
 * prototype dropped the old teal "active dot").
 *
 * Renders INSIDE ScreenShell's footer slot, which owns the bg, top border and
 * the bottom safe-area inset (same contract as `Footer`) — adding them here
 * too doubled the padding into a dead strip under the labels.
 *
 * The design archive also documents a 5-column variant with a centre FAB; we
 * skip it for the foundation pass because the field doctor's primary CTA
 * ("new visit") lives inside the home screen, not the chrome — fewer concepts
 * to learn and one less thumb-target collision with the home indicator.
 */
export type TabKey = "home" | "visits" | "inv" | "me";

interface BottomBarProps {
  active?: TabKey;
  onSelect?: (key: TabKey) => void;
}

const TABS: Array<{ key: TabKey; label: string; Icon: typeof Home }> = [
  { key: "home", label: "الرئيسية", Icon: Home },
  { key: "visits", label: "الزيارات", Icon: Calendar },
  { key: "inv", label: "المخزون", Icon: Box },
  { key: "me", label: "حسابي", Icon: User },
];

export function BottomBar({ active = "home", onSelect }: BottomBarProps) {
  return (
    <View className="flex-row px-2 pb-1 pt-2">
      {TABS.map(({ key, label, Icon }) => {
        const isActive = key === active;
        const tint = isActive ? colors.navy[900] : colors.ink[400];
        return (
          <Pressable
            key={key}
            onPress={() => onSelect?.(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            className="flex-1 items-center gap-0.5 py-1.5"
          >
            <Icon size={22} color={tint} />
            <Text
              className={`text-[11px] font-tajawal-bold ${isActive ? "text-navy-900" : "text-ink-400"}`}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
