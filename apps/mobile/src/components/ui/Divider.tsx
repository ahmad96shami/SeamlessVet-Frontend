import { View } from "react-native";

/**
 * Hairline divider. `dashed` matches `.divider.dashed` from styles.css (used
 * inside cards to separate stacked rows without breaking the card silhouette).
 * RN doesn't support a fading linear-gradient hairline, so the solid variant
 * here is a flat 1-px line — visually close enough at the design's spacing.
 */
export function Divider({ dashed }: { dashed?: boolean }) {
  return (
    <View
      className={`my-2 h-px ${dashed ? "border-t border-dashed border-ink-200" : "bg-ink-100"}`}
    />
  );
}
