import { Text, View } from "react-native";

import { toArabicDigits } from "@/lib/numerals";

/**
 * The design's schedule time block — the 56-px column on a "جدول اليوم" row
 * showing the hour over the minutes in Arabic-Indic digits. `active` tints it
 * teal for the next upcoming visit.
 */
interface TimeBoxProps {
  /** "HH:MM" (24h). Anything unparsable renders as-is in the hour slot. */
  time: string;
  active?: boolean;
}

export function TimeBox({ time, active }: TimeBoxProps) {
  const [hour, minute] = time.split(":");
  const text = active ? "text-teal-700" : "text-ink-700";
  return (
    <View
      className={`w-14 items-center rounded-chip px-1.5 py-2 ${active ? "bg-teal-50" : "bg-ink-50"}`}
    >
      <Text className={`${text} text-[16px] font-tajawal-bold`}>{toArabicDigits(hour ?? time)}</Text>
      {minute ? (
        <Text className={`${text} mt-0.5 text-[11px] font-tajawal`}>{toArabicDigits(minute)}</Text>
      ) : null}
    </View>
  );
}
