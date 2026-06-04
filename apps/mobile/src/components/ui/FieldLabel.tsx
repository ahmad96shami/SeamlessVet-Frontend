import { Text, type TextProps } from "react-native";

/**
 * The design's standalone field label — 13/700 ink-700 above a control that
 * isn't an `Input` (amount cards, chip groups, customer pickers…). `Input`
 * already embeds the same label style; use this when the control is custom.
 */
export function FieldLabel({ children, className, ...rest }: TextProps) {
  return (
    <Text className={`text-ink-700 mb-2 text-[13px] font-tajawal-bold ${className ?? ""}`} {...rest}>
      {children}
    </Text>
  );
}
