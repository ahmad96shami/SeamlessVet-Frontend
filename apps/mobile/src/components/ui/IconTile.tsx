import { View, type ViewProps } from "react-native";

import { shadow } from "@/theme";

/**
 * The design's tinted icon square — the leading element of nearly every row and
 * card (list rows, stat cards, info sections, the home avatar…).
 *
 * Sizes follow the design's three squares: `sm` 36px/r12 (stat cards, quick
 * actions), `md` 44px/r14 (list rows, reminders, the home avatar), `lg` 64px/r18
 * (inventory summary, the حسابي profile card).
 *
 * `badge` renders a small overlay bubble on the tile's top-end corner (the
 * low-stock warning dot on inventory rows).
 */
type Size = "sm" | "md" | "lg";
type Tone = "teal" | "amber" | "green" | "red" | "neutral";

interface IconTileProps extends ViewProps {
  size?: Size;
  tone?: Tone;
  badge?: React.ReactNode;
}

const SIZE: Record<Size, string> = {
  sm: "h-9 w-9 rounded-chip",
  md: "h-11 w-11 rounded-[14px]",
  lg: "h-16 w-16 rounded-[18px]",
};

const TONE: Record<Tone, string> = {
  teal: "bg-teal-50",
  amber: "bg-amber-soft",
  green: "bg-emerald-soft",
  red: "bg-rose-soft",
  neutral: "bg-ink-50",
};

export function IconTile({
  size = "md",
  tone = "teal",
  badge,
  className,
  children,
  ...rest
}: IconTileProps) {
  return (
    <View
      className={`${SIZE[size]} ${TONE[tone]} items-center justify-center ${className ?? ""}`}
      {...rest}
    >
      {children}
      {badge ? (
        <View
          className="bg-paper absolute -end-1 -top-1 h-[18px] w-[18px] items-center justify-center rounded-pill"
          // Token style, not the shadow class — badges mount/unmount with stock
          // status and a class-borne shadow can late-upgrade (see Card.tsx).
          style={shadow.card}
        >
          {badge}
        </View>
      ) : null}
    </View>
  );
}
