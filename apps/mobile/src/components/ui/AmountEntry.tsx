import { TextInput, Text, View } from "react-native";

import { colors } from "@/theme";

import { Card } from "./Card";
import { Chip } from "./Chip";

/**
 * The design's big-amount entry card (the سند قبض "المبلغ المستلم" block) — a
 * 32-px centred numeric field with the currency trailing, plus a row of quick
 * preset chips (100 / 250 / 500 / 1000 / المتبقي).
 *
 * Presets are plain labels; the caller maps a tapped label to a value (e.g.,
 * "المتبقي" → the customer's outstanding balance).
 */
interface AmountEntryProps {
  value: string;
  onChangeText: (value: string) => void;
  presets?: readonly string[];
  onPreset?: (label: string) => void;
  currency?: string;
}

export function AmountEntry({
  value,
  onChangeText,
  presets,
  onPreset,
  currency = "شيقل",
}: AmountEntryProps) {
  return (
    <Card className="p-4">
      <View className="flex-row items-baseline justify-center gap-2">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="numeric"
          placeholderTextColor={colors.ink[400]}
          className="text-navy-900 min-w-[80px] p-0 text-center text-[32px] font-tajawal-extrabold"
        />
        <Text className="text-ink-500 text-[18px] font-tajawal-bold">{currency}</Text>
      </View>
      {presets?.length ? (
        <View className="mt-3 flex-row flex-wrap justify-center gap-1.5">
          {presets.map((label) => (
            <Chip key={label} label={label} onPress={() => onPreset?.(label)} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}
