import { Text } from "react-native";

import { Card } from "./Card";
import { IconTile } from "./IconTile";
import { Skeleton } from "./Skeleton";

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
  /** Pulsing placeholder instead of the value while its query loads. */
  loading?: boolean;
}

export function Stat({ value, label, icon, tone = "teal", loading }: StatProps) {
  return (
    <Card className="min-h-[116px] flex-1 items-start p-3.5">
      <IconTile size="sm" tone={tone} className="mb-2">
        {icon}
      </IconTile>
      {loading ? (
        <Skeleton className="my-1 h-6 w-10 rounded-chip" />
      ) : (
        <Text className="text-navy-900 text-[22px] font-tajawal-extrabold">{value}</Text>
      )}
      <Text className="text-ink-500 mt-0.5 text-[12px] font-tajawal">{label}</Text>
    </Card>
  );
}
