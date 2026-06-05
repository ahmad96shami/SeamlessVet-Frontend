import Svg, { Circle, Ellipse, G, Path, Rect, type SvgProps } from "react-native-svg";
import { colors } from "@/theme";

/**
 * SeamlessVet line-icon set — 24×24 viewport, 1.8 stroke, round caps/joins,
 * `currentColor` (so callers control colour via `color={…}`). Ported from the
 * design archive's `primitives.jsx` `I.*` namespace; one named export per icon
 * mirrors the source so the screen JSX maps 1:1.
 */
export interface IconProps extends Omit<SvgProps, "viewBox" | "fill" | "stroke"> {
  size?: number;
  /** Stroke width override (design default = 1.8). */
  sw?: number;
  /** Fill mode for filled icons like `Star`. */
  fillMode?: "none" | "current";
}

// Default stroke colour matches token `ink-900` — the design's body-ink. Callers
// override via `color` to tint icons (navy, teal, amber, etc.).
const DEFAULT_STROKE = colors.ink[900];

function Frame({
  size = 22,
  sw = 1.8,
  fillMode = "none",
  color,
  children,
  ...rest
}: IconProps & { children: React.ReactNode }) {
  const stroke = color ?? DEFAULT_STROKE;
  return (
    // `color={stroke}` makes `currentColor` resolve to the chosen tint inside
    // filled sub-elements (the eyes on Cow, etc.) — that's how react-native-svg
    // v15+ honours the SVG-style `currentColor` literal.
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fillMode === "current" ? stroke : "none"}
      stroke={stroke}
      color={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </Svg>
  );
}

// SVG paths do NOT bidi-mirror — these are drawn for the app's forced RTL:
// "back" points → (toward where you came from), "forward"/drill-in points ←.
export const Back = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M9 6l6 6-6 6" />
  </Frame>
);

export const Forward = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M15 6l-6 6 6 6" />
  </Frame>
);

export const More = (p: IconProps) => (
  <Frame {...p}>
    <Circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
    <Circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <Circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
  </Frame>
);

export const Search = (p: IconProps) => (
  <Frame {...p}>
    <Circle cx="11" cy="11" r="7" />
    <Path d="M20 20l-3.5-3.5" />
  </Frame>
);

export const Bell = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M6 16h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v4L6 16z" />
    <Path d="M10 19a2 2 0 0 0 4 0" />
  </Frame>
);

export const Home = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M3.5 11.5L12 4l8.5 7.5" />
    <Path d="M5.5 10.5V20h13v-9.5" />
    <Path d="M10 20v-5h4v5" />
  </Frame>
);

export const Briefcase = (p: IconProps) => (
  <Frame {...p}>
    <Rect x="3" y="7" width="18" height="13" rx="2.5" />
    <Path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
    <Path d="M3 12h18" />
  </Frame>
);

export const User = (p: IconProps) => (
  <Frame {...p}>
    <Circle cx="12" cy="8" r="3.5" />
    <Path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
  </Frame>
);

export const Add = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M12 5v14M5 12h14" />
  </Frame>
);

export const Check = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M5 12.5l4.5 4.5L19 7" />
  </Frame>
);

export const Pin = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
    <Circle cx="12" cy="9" r="2.5" />
  </Frame>
);

export const Star = (p: IconProps) => (
  <Frame {...p} fillMode="current" sw={0}>
    <Path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.6l-5.4 2.8 1-6.1L3.2 10l6.1-.9z" />
  </Frame>
);

export const Calendar = (p: IconProps) => (
  <Frame {...p}>
    <Rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <Path d="M3.5 10h17M8 3v4M16 3v4" />
  </Frame>
);

export const Clock = (p: IconProps) => (
  <Frame {...p}>
    <Circle cx="12" cy="12" r="8" />
    <Path d="M12 8v4l3 2" />
  </Frame>
);

export const Pill = (p: IconProps) => (
  <Frame {...p}>
    <Rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)" />
    <Path d="M9.5 7.5l7 7" />
  </Frame>
);

// lucide's `syringe` geometry (ISC) — matches the web app's vaccination icon.
export const Syringe = (p: IconProps) => (
  <Frame {...p}>
    <Path d="m18 2 4 4" />
    <Path d="m17 7 3-3" />
    <Path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5" />
    <Path d="m9 11 4 4" />
    <Path d="m5 19-3 3" />
    <Path d="m14 4 6 6" />
  </Frame>
);

export const Stethoscope = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M5 4v5a4 4 0 0 0 8 0V4" />
    <Path d="M9 13v3a4 4 0 0 0 8 0v-2" />
    <Circle cx="17" cy="11" r="2" />
  </Frame>
);

export const Truck = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M2 7h11v9H2z" />
    <Path d="M13 10h5l3 3v3h-8" />
    <Circle cx="6" cy="18" r="2" />
    <Circle cx="17" cy="18" r="2" />
  </Frame>
);

export const Box = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M3 7l9-4 9 4-9 4-9-4z" />
    <Path d="M3 7v10l9 4 9-4V7" />
    <Path d="M12 11v10" />
  </Frame>
);

export const Cow = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M5 6c-1-1.5-1-3 .8-3.2 1.6-.2 2.4 1 2.7 2.5" />
    <Path d="M19 6c1-1.5 1-3-.8-3.2-1.6-.2-2.4 1-2.7 2.5" />
    <Path d="M7 7h10c2.2 0 4 1.8 4 4v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3c0-2.2 1.8-4 4-4z" />
    <Circle cx="9" cy="13" r="0.9" fill="currentColor" stroke="none" />
    <Circle cx="15" cy="13" r="0.9" fill="currentColor" stroke="none" />
    <Path d="M10 17.5c.7.5 1.4.7 2 .7s1.3-.2 2-.7" />
    <Ellipse cx="12" cy="17" rx="2" ry="1.4" />
  </Frame>
);

export const Bird = (p: IconProps) => (
  <Frame {...p}>
    <G>
      <Path d="M6 6.5c0-.7.6-1.3 1.3-1.3.4 0 .8.2 1 .5l.4-.4c.5-.5 1.4-.5 1.9 0 .3.3.4.6.4 1" />
      <Path d="M5.5 7.5C4 9 3 11 3 13a6 6 0 0 0 6 6h3a6 6 0 0 0 6-6c0-1.5-.6-2.9-1.5-4" />
      <Path d="M16.5 9c1.5-.5 3-2 3.5-4-2.5.3-4 1.5-4.5 3" />
      <Path d="M9 7.3l-.7-.7" />
      <Circle cx="7" cy="9" r="0.7" fill="currentColor" stroke="none" />
      <Path d="M5 9.5l-1.6.3.9 1.2" />
      <Path d="M9 19v2M13 19v2" />
    </G>
  </Frame>
);

export const House = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </Frame>
);

export const Paper = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M6 3h9l4 4v14H6z" />
    <Path d="M14 3v5h5" />
    <Path d="M9 13h7M9 17h5" />
  </Frame>
);

export const Receipt = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z" />
    <Path d="M9 8h6M9 12h6M9 16h4" />
  </Frame>
);

export const Camera = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M5 9h2.5l1.2-2h6.6L16.5 9H19a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 5 9z" />
    <Circle cx="12" cy="13.5" r="3" />
  </Frame>
);

export const Image = (p: IconProps) => (
  <Frame {...p}>
    <Rect x="4" y="5" width="16" height="14" rx="2.5" />
    <Circle cx="9" cy="10" r="1.5" />
    <Path d="M5 17l4.5-4.5 3 3L16 11l3.5 3.5" />
  </Frame>
);

export const ArrowDown = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M12 5v14M6 13l6 6 6-6" />
  </Frame>
);

export const ArrowUp = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M12 19V5M6 11l6-6 6 6" />
  </Frame>
);

export const WifiOff = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M3 3l18 18" />
    <Path d="M5 12a10 10 0 0 1 4-2.5" />
    <Path d="M2 8.5a14 14 0 0 1 6.5-3" />
    <Path d="M15 9a10 10 0 0 1 4 3" />
    <Path d="M22 8.5a14 14 0 0 0-6-3.3" />
    <Circle cx="12" cy="18" r="1.4" fill="currentColor" />
  </Frame>
);

export const Warn = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M12 3l10 18H2z" />
    <Path d="M12 10v5M12 18v.5" />
  </Frame>
);

export const Filter = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M4 5h16l-6 8v6l-4-2v-4z" />
  </Frame>
);

export const Send = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M5 12l16-8-6 18-3-7z" />
    <Path d="M5 12l7 3" />
  </Frame>
);

export const Print = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M7 9V4h10v5" />
    <Rect x="4" y="9" width="16" height="8" rx="2" />
    <Path d="M7 17h10v4H7z" />
  </Frame>
);

export const Edit = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M4 20h4l10-10-4-4L4 16z" />
    <Path d="M14 6l4 4" />
  </Frame>
);

export const Trash = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" />
  </Frame>
);

export const Shield = (p: IconProps) => (
  <Frame {...p}>
    <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    <Path d="M9 12l2 2 4-4" />
  </Frame>
);

export const Spinner = (p: IconProps) => (
  <Frame {...p}>
    <Circle cx="12" cy="12" r="9" opacity="0.2" />
    <Path d="M21 12a9 9 0 0 0-9-9" />
  </Frame>
);
