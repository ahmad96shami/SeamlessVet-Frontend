import { Pressable, Text, View } from "react-native";

import { colors } from "@/theme";
import { toArabicDigits } from "@/lib/numerals";

import { Add } from "../icons";

/**
 * The design's quantity stepper — a pill track (ink-50) holding two 28-px paper
 * buttons around an Arabic-Indic count. Used wherever a quantity is picked
 * (inventory load/return, the visit wizard's meds step).
 *
 * Under the app's forced RTL, `flex-row` already renders first-child-on-the-right,
 * so the child order (decrement, value, increment) matches the design: − right, + left.
 */
interface StepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Grey out + disable the increment (e.g., no stock left to add). */
  disableIncrement?: boolean;
}

export function Stepper({ value, onIncrement, onDecrement, disableIncrement }: StepperProps) {
  return (
    <View className="bg-ink-50 flex-row items-center gap-2 rounded-pill p-1">
      <Pressable
        onPress={onDecrement}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="إنقاص"
        className="bg-paper h-7 w-7 items-center justify-center rounded-pill active:opacity-80"
      >
        <Text className="text-navy-900 text-[16px] font-tajawal-extrabold">−</Text>
      </Pressable>
      <Text className="text-navy-900 min-w-[24px] text-center text-[14px] font-tajawal-extrabold">
        {toArabicDigits(value)}
      </Text>
      <Pressable
        onPress={onIncrement}
        disabled={disableIncrement}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="زيادة"
        className={`bg-paper h-7 w-7 items-center justify-center rounded-pill active:opacity-80 ${
          disableIncrement ? "opacity-40" : ""
        }`}
      >
        <Text className="text-navy-900 text-[16px] font-tajawal-extrabold">+</Text>
      </Pressable>
    </View>
  );
}

/**
 * The stepper's resting state — the bordered 40-px "+" button shown before a row
 * has a quantity (tapping it starts the count at 1 and swaps in the Stepper).
 */
export function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="إضافة"
      className="border-ink-100 bg-paper h-10 w-10 items-center justify-center rounded-chip border active:opacity-80"
    >
      <Add size={18} color={colors.navy[900]} />
    </Pressable>
  );
}
