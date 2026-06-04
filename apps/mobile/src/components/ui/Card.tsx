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
  // The shadow comes from the token STYLE object (iOS shadow* + Android elevation),
  // NOT the `shadow-card` class: Tailwind shadow classes carry CSS variables, and a
  // Card that flips flat↔shadowed across re-renders (e.g. an empty-state Card being
  // reconciled into a data Card at the same tree position) would make css-interop
  // "upgrade" the View after first render — its dev warning then crashes the screen
  // ("Couldn't find a navigation context", MoD smoke). Style objects never upgrade.
  const tone = flat ? "border border-ink-100" : "";
  return (
    <View
      className={`bg-paper rounded-card ${tone} ${className ?? ""}`}
      style={[flat ? undefined : shadow.card, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
