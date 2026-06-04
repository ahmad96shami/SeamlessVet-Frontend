import { Text, View, type ViewProps } from "react-native";

/**
 * The design's inline info strip — a soft tinted card with an icon and a short
 * explanation ("يتم خصم الكميات من المستودع الرئيسي…"). `teal` for informative
 * flow hints, `neutral` for footnotes (the statement's settlement note).
 *
 * Pass rich copy (bold spans) as nested `<Text>` children — the tone colour and
 * size are inherited from the wrapper Text.
 */
type Tone = "teal" | "neutral";

interface InfoBannerProps extends ViewProps {
  icon?: React.ReactNode;
  tone?: Tone;
}

const TONE: Record<Tone, { box: string; text: string }> = {
  teal: { box: "bg-teal-50 border-teal-100", text: "text-teal-700" },
  neutral: { box: "bg-ink-50 border-ink-100", text: "text-ink-700" },
};

export function InfoBanner({ icon, tone = "teal", className, children, ...rest }: InfoBannerProps) {
  const palette = TONE[tone];
  return (
    <View
      className={`${palette.box} flex-row items-center gap-2.5 rounded-card border p-3 ${className ?? ""}`}
      {...rest}
    >
      {icon}
      <Text className={`${palette.text} flex-1 text-[13px] leading-5 font-tajawal`}>
        {children}
      </Text>
    </View>
  );
}
