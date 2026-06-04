import { ActivityIndicator, Pressable, Text, View, type PressableProps } from "react-native";

import { colors } from "@/theme";

/**
 * The four button shapes from the design's `.btn` system:
 * - `primary` — navy CTA, white text (the dominant action on a screen).
 * - `teal` — teal CTA for confirmations / continue (visit flow + receipt).
 * - `soft` — neutral grey for secondary actions inside cards (e.g. "schedule").
 * - `ghost` — text-only navy on transparent for tertiary actions ("logout").
 *
 * `size` matches the design's `.btn-sm` modifier (the 28pt-tall chip-style
 * button used inline). All variants stack `block`-wide by default unless wrapped
 * in a row.
 */
type Variant = "primary" | "teal" | "soft" | "ghost";
type Size = "md" | "sm";

interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  block?: boolean;
}

const TONE: Record<Variant, { bg: string; text: string; spinner: string }> = {
  primary: { bg: "bg-navy-900 active:bg-navy-800", text: "text-paper", spinner: colors.white },
  teal: { bg: "bg-teal-500 active:bg-teal-600", text: "text-paper", spinner: colors.white },
  soft: { bg: "bg-ink-100 active:bg-ink-200", text: "text-navy-900", spinner: colors.navy[900] },
  ghost: { bg: "bg-transparent active:bg-ink-100", text: "text-navy-900", spinner: colors.navy[900] },
};

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  leadingIcon,
  block,
  ...rest
}: ButtonProps) {
  const tone = TONE[variant];
  const isDisabled = disabled || loading;
  const padding = size === "sm" ? "px-3.5 py-[9px] rounded-[10px]" : "px-[18px] py-3.5 rounded-input";
  const fontSize = size === "sm" ? "text-[13px]" : "text-[15px]";

  return (
    <Pressable
      disabled={isDisabled}
      className={`${tone.bg} ${padding} ${block ? "self-stretch" : ""} flex-row items-center justify-center ${
        isDisabled ? "opacity-60" : ""
      }`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={tone.spinner} />
      ) : (
        <View className="flex-row items-center gap-2">
          {leadingIcon}
          <Text className={`${tone.text} ${fontSize} font-tajawal-bold`}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
