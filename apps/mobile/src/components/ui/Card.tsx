import { View, type ViewProps } from "react-native";

import { shadow } from "@/theme";

/**
 * The design's `.card` element: a paper-coloured rounded-22 container with a
 * soft drop shadow. `flat` swaps the shadow for a hairline border (matches
 * `.card.flat` in styles.css — used for grouped/nested cards like the items in
 * a totals strip).
 */
interface CardProps extends ViewProps {
  flat?: boolean;
}

export function Card({ flat, className, style, children, ...rest }: CardProps) {
  const tone = flat ? "border border-ink-100" : "shadow-card";
  return (
    <View
      className={`bg-paper rounded-card ${tone} ${className ?? ""}`}
      // RN can't render the design's compound shadow at runtime; the elevation
      // prop is the Android counterpart of the iOS shadow set by `shadow-card`.
      style={[flat ? undefined : { elevation: shadow.card.elevation }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
