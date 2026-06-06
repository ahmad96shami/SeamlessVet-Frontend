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
  /** The design's tighter `.pill.compact` (2×8 padding) for dense meta rows. */
  compact?: boolean;
}

const TONE: Record<Tone, { bg: string; text: string }> = {
  neutral: { bg: "bg-ink-100", text: "text-ink-700" },
  teal: { bg: "bg-teal-50", text: "text-teal-700" },
  amber: { bg: "bg-amber-soft", text: "text-amber-ink" },
  green: { bg: "bg-emerald-soft", text: "text-emerald-ink" },
  red: { bg: "bg-rose-soft", text: "text-rose-ink" },
  navy: { bg: "bg-navy-900", text: "text-paper" },
};

export function Pill({ label, tone = "neutral", leadingIcon, compact, className, ...rest }: PillProps) {
  const palette = TONE[tone];
  const padding = compact ? "px-2 py-0.5" : "px-3.5 py-1.5";
  return (
    <View
      className={`${palette.bg} ${padding} self-start flex-row items-center gap-1.5 rounded-pill ${className ?? ""}`}
      {...rest}
    >
      {leadingIcon}
      <Text className={`${palette.text} text-[12px] font-tajawal-bold`}>{label}</Text>
    </View>
  );
}
