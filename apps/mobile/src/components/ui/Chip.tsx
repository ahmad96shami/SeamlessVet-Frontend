import { Pressable, Text, View, type PressableProps } from "react-native";

/**
 * The design's `.chip` — a *tappable* pill (filter, segmented option). Bigger
 * padding than `Pill`, hairline border on the inactive state, and two active
 * tones (`navy` and `teal`) from styles.css's `.chip.active` / `.chip.teal-active`.
 */
type Active = "off" | "navy" | "teal";

interface ChipProps extends Omit<PressableProps, "children"> {
  label: string;
  active?: Active;
  leadingIcon?: React.ReactNode;
}

const TONE: Record<Active, { bg: string; text: string; border: string }> = {
  off: { bg: "bg-paper", text: "text-ink-700", border: "border-ink-100" },
  navy: { bg: "bg-navy-900", text: "text-paper", border: "border-navy-900" },
  teal: { bg: "bg-teal-500", text: "text-paper", border: "border-teal-500" },
};

export function Chip({ label, active = "off", leadingIcon, ...rest }: ChipProps) {
  const tone = TONE[active];
  return (
    <Pressable
      className={`${tone.bg} ${tone.border} self-start flex-row items-center gap-1.5 rounded-pill border px-3.5 py-2`}
      {...rest}
    >
      {leadingIcon ? <View>{leadingIcon}</View> : null}
      <Text className={`${tone.text} text-[13px] font-tajawal-bold`}>{label}</Text>
    </Pressable>
  );
}
