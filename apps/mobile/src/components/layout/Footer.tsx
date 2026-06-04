import { View, type ViewProps } from "react-native";

/**
 * The design's pinned action bar content — a horizontal row of summary text +
 * CTA (or two buttons at flex 1 / 1.4). Render it INSIDE `ScreenShell`'s
 * `footer` slot: the shell already owns the paper background, hairline top
 * border and safe-area inset; this owns only the row's padding and gap.
 *
 *   <ScreenShell footer={<Footer><Button …/><Button …/></Footer>} …>
 */
export function Footer({ className, children, ...rest }: ViewProps) {
  return (
    <View
      className={`flex-row items-center gap-2.5 px-5 pb-2.5 pt-3 ${className ?? ""}`}
      {...rest}
    >
      {children}
    </View>
  );
}
