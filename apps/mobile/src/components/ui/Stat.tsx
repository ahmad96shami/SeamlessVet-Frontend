import { Text, View } from "react-native";

import { Card } from "./Card";

/**
 * The design's `.stat` cell from the home dashboard — a small card with a tinted
 * icon square, a big tabular number, and a label. Used in a horizontal row of
 * 3–4 at the top of the home screen.
 *
 * `tone` swaps the icon-square's tint: teal (default), amber for warnings,
 * green for receipts/positive, red for over-limit.
 */
type Tone = "teal" | "amber" | "green" | "red";

interface StatProps {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  tone?: Tone;
}

const TONE: Record<Tone, string> = {
  teal: "bg-teal-50",
  amber: "bg-amber-soft",
  green: "bg-emerald-soft",
  red: "bg-rose-soft",
};

export function Stat({ value, label, icon, tone = "teal" }: StatProps) {
  return (
    <Card className="min-h-[116px] flex-1 items-start p-3.5">
      <View className={`mb-2 h-9 w-9 items-center justify-center rounded-chip ${TONE[tone]}`}>
        {icon}
      </View>
      <Text className="text-navy-900 text-[22px] font-tajawal-extrabold">{value}</Text>
      <Text className="text-ink-500 mt-0.5 text-[12px] font-tajawal">{label}</Text>
    </Card>
  );
}
