import { Text, type TextProps } from "react-native";

/**
 * Renders an amount with the design's currency suffix: the digits use Arabic
 * Western numerals (`ar-EG-u-nu-latn`) and tabular figures, with "شيقل" trailing
 * at 85% size — exactly the `Shekel` primitive from the design archive.
 *
 * `dim` lifts the colour to ink-500 for secondary financial values (subtotals
 * inside a totals strip vs. the bolded grand total).
 */
interface MoneyProps extends TextProps {
  value: number;
  dim?: boolean;
}

export function Money({ value, dim, className, ...rest }: MoneyProps) {
  const tone = dim ? "text-ink-500" : "text-ink-900";
  return (
    <Text className={`${tone} font-tajawal-bold ${className ?? ""}`} {...rest}>
      {value.toLocaleString("ar-EG-u-nu-latn", { maximumFractionDigits: 2 })}{" "}
      <Text className="text-[0.85em] opacity-80">شيقل</Text>
    </Text>
  );
}
