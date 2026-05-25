import type { ReactNode } from "react";

/**
 * SeamlessVet icon set — the design system's bespoke inline SVGs (24×24, 1.8 stroke,
 * currentColor), ported from ds-primitives.jsx. Sized via `className` (Tailwind `size-4`
 * overrides the width/height attrs, like lucide) or the `size` prop. The 3D "clay"
 * client-type icons (icons-3d.jsx) are deferred to the customer/visit screens.
 */
export interface IconProps {
  className?: string;
  size?: number;
}

function Svg({
  className,
  size = 24,
  fill = "none",
  sw = 1.8,
  children,
}: IconProps & { fill?: string; sw?: number; children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const Icon = {
  // navigation chevrons / arrows
  back: (p: IconProps) => (
    <Svg {...p}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  ),
  fwd: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  ),
  chevronLeft: (p: IconProps) => (
    <Svg {...p}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  ),
  chevronRight: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  ),
  chevronDown: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  ),
  arrowUp: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  ),
  arrowDown: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </Svg>
  ),
  more: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  ),
  close: (p: IconProps) => (
    <Svg {...p} sw={2}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  // actions
  add: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  plus: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  check: (p: IconProps) => (
    <Svg {...p}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  ),
  edit: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 20h4l10-10-4-4L4 16z" />
      <path d="M14 6l4 4" />
    </Svg>
  ),
  trash: (p: IconProps) => (
    <Svg {...p}>
      <path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13" />
    </Svg>
  ),
  search: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Svg>
  ),
  filter: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 5h16l-6 8v6l-4-2v-4z" />
    </Svg>
  ),
  send: (p: IconProps) => (
    <Svg {...p}>
      <path d="M5 12l16-8-6 18-3-7z" />
      <path d="M5 12l7 3" />
    </Svg>
  ),
  print: (p: IconProps) => (
    <Svg {...p}>
      <path d="M7 9V4h10v5" />
      <rect x="4" y="9" width="16" height="8" rx="2" />
      <path d="M7 17h10v4H7z" />
    </Svg>
  ),
  link: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 15l6-6" />
      <path d="M11 5l1.5-1.5a4 4 0 0 1 5.7 5.7L17 11" />
      <path d="M13 19l-1.5 1.5a4 4 0 0 1-5.7-5.7L7 13" />
    </Svg>
  ),
  // domain / nav
  home: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3.5 11.5L12 4l8.5 7.5" />
      <path d="M5.5 10.5V20h13v-9.5" />
      <path d="M10 20v-5h4v5" />
    </Svg>
  ),
  briefcase: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M3 12h18" />
    </Svg>
  ),
  inbox: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 13l2-7h12l2 7" />
      <path d="M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
      <path d="M4 13h4l1 2h6l1-2h4" />
    </Svg>
  ),
  user: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" />
    </Svg>
  ),
  stethoscope: (p: IconProps) => (
    <Svg {...p}>
      <path d="M5 4v5a4 4 0 0 0 8 0V4" />
      <path d="M9 13v3a4 4 0 0 0 8 0v-2" />
      <circle cx="17" cy="11" r="2" />
    </Svg>
  ),
  receipt: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </Svg>
  ),
  box: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </Svg>
  ),
  pill: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)" />
      <path d="M9.5 7.5l7 7" />
    </Svg>
  ),
  syringe: (p: IconProps) => (
    <Svg {...p}>
      <path d="M19 5l-2-2" />
      <path d="M18 6l-9 9-3 3-1-1 3-3 9-9 1 1z" />
      <path d="M11 13l-1-1M14 10l-1-1M16 8l-1-1" />
    </Svg>
  ),
  paper: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h7M9 17h5" />
    </Svg>
  ),
  truck: (p: IconProps) => (
    <Svg {...p}>
      <path d="M2 7h11v9H2z" />
      <path d="M13 10h5l3 3v3h-8" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </Svg>
  ),
  cal: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Svg>
  ),
  clock: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </Svg>
  ),
  bell: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 16h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v4L6 16z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </Svg>
  ),
  shield: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  ),
  warn: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18v.5" />
    </Svg>
  ),
  chart: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 16v-4M13 16V8M18 16v-6" />
    </Svg>
  ),
  // utility (extras not in the design's set, matched to its line style)
  globe: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
    </Svg>
  ),
  logout: (p: IconProps) => (
    <Svg {...p}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 16l-4-4 4-4" />
      <path d="M6 12h10" />
    </Svg>
  ),
  settings: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.8 2 2 0 1 1-2.8 2.8 1.7 1.7 0 0 0-2.8 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.8-1.2 2 2 0 1 1-2.8-2.8 1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1 2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8 2 2 0 1 1 2.8-2.8 1.7 1.7 0 0 0 2.8-1.2 2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.8 1.2 2 2 0 1 1 2.8 2.8 1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1 2 2 0 1 1 0 4 1.7 1.7 0 0 0-1.5 1z" />
    </Svg>
  ),
  help: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  ),
  spinner: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </Svg>
  ),
  image: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M21 16l-5-4-4 3-2.5-2L3 18" />
    </Svg>
  ),
  upload: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 15V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </Svg>
  ),
} satisfies Record<string, (p: IconProps) => ReactNode>;

export type IconName = keyof typeof Icon;
