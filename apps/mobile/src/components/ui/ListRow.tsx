import { Pressable, View, type PressableProps } from "react-native";

import { shadow } from "@/theme";

/**
 * The design's list-row card — the standard anatomy of every list in the app:
 * a paper rounded-22 row laid out `[leading tile] [title/sub/meta] [trailing]`.
 * Children compose freely; this primitive owns the silhouette (padding, gap,
 * radius, shadow) so all lists stay identical.
 *
 * - `flat` swaps the shadow for a hairline border (nested/grouped rows).
 * - `selected` draws the design's 2-px teal ring (picked items in the inventory
 *   load screen / the visit wizard's meds step).
 * - With `onPress` the row is a Pressable with the standard press feedback.
 */
interface ListRowProps extends Omit<PressableProps, "children"> {
  flat?: boolean;
  selected?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ListRow({ flat, selected, onPress, className, children, ...rest }: ListRowProps) {
  const tone = selected
    ? "border-2 border-teal-200"
    : flat
      ? "border border-ink-100"
      : "shadow-card";
  const base = `bg-paper rounded-card flex-row items-center gap-3 p-3.5 ${tone} ${className ?? ""}`;
  // Android side of shadow-card (iOS-only in RN) — see src/theme/tokens.js.
  const lift = flat || selected ? undefined : { elevation: shadow.card.elevation };

  if (!onPress) {
    return (
      <View className={base} style={lift}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      className={`${base} active:opacity-90`}
      style={lift}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
