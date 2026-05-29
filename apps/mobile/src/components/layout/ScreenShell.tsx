import { ScrollView, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SessionBanner } from "@/components/SessionBanner";

/**
 * The design's `.sv-screen` container — a vertical flex column with a chosen
 * background. The flexible `body` content is scrollable; `header` and `footer`
 * slots stay pinned (they map to `.sv-topbar` and `.sv-footer` in styles.css).
 *
 * `background`:
 *   - `default` → ink-50 (the dashboard "off-white" canvas)
 *   - `paper`   → paper white (used by forms / auth)
 *   - `teal`    → the teal-500 hero canvas (login splash)
 *
 * Safe-area insets are absorbed into the header/footer so the body stays
 * borderless against the navbar / home-indicator.
 */
type Background = "default" | "paper" | "teal";

interface ScreenShellProps extends ViewProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  background?: Background;
  /** Drop the scroll wrapper (forms with their own KeyboardAvoidingView). */
  staticBody?: boolean;
  /** Horizontal padding of the body. Default 20px (the design's `.sv-body`). */
  bodyPaddingX?: number;
}

const BG: Record<Background, string> = {
  default: "bg-ink-50",
  paper: "bg-paper",
  teal: "bg-teal-500",
};

export function ScreenShell({
  header,
  footer,
  background = "default",
  staticBody,
  bodyPaddingX = 20,
  children,
  className,
  style,
  ...rest
}: ScreenShellProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`flex-1 ${BG[background]} ${className ?? ""}`}
      style={[{ paddingTop: insets.top }, style]}
      {...rest}
    >
      {header}
      <SessionBanner />
      {staticBody ? (
        <View
          className="flex-1"
          style={{ paddingHorizontal: bodyPaddingX, paddingTop: 16, paddingBottom: 24 }}
        >
          {children}
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: bodyPaddingX,
            paddingTop: 16,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      )}
      {footer ? (
        <View style={{ paddingBottom: insets.bottom }} className="bg-paper border-t border-ink-100">
          {footer}
        </View>
      ) : null}
    </View>
  );
}
