import { Text, View, type ViewProps } from "react-native";

/**
 * The design's `.pill` — a small rounded-999 badge with a tone-tinted background
 * and text. Default is a neutral grey; `tone` selects from the five semantic
 * tints in styles.css (`.pill.teal/amber/green/red/navy`).
 *
 * Pills are sized smaller than chips (5×10 px padding, 12-px text) and are
 * non-interactive — they decorate a row, they don't drive a tap.
 */
type Tone = "neutral" | "teal" | "amber" | "green" | "red" | "navy";

interface PillProps extends ViewProps {
  label: React.ReactNode;
  tone?: Tone;
  leadingIcon?: React.ReactNode;
}

const TONE: Record<Tone, { bg: string; text: string }> = {
  neutral: { bg: "bg-ink-100", text: "text-ink-700" },
  teal: { bg: "bg-teal-50", text: "text-teal-700" },
  amber: { bg: "bg-amber-soft", text: "text-amber-ink" },
  green: { bg: "bg-emerald-soft", text: "text-emerald-ink" },
  red: { bg: "bg-rose-soft", text: "text-rose-ink" },
  navy: { bg: "bg-navy-900", text: "text-paper" },
};

export function Pill({ label, tone = "neutral", leadingIcon, className, ...rest }: PillProps) {
  const palette = TONE[tone];
  return (
    <View
      className={`${palette.bg} self-start flex-row items-center gap-1.5 rounded-pill px-2.5 py-1 ${className ?? ""}`}
      {...rest}
    >
      {leadingIcon}
      <Text className={`${palette.text} text-[12px] font-tajawal-bold`}>{label}</Text>
    </View>
  );
}
