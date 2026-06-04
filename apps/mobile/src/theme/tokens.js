// SeamlessVet Field — the design-system token source of truth (MoD.1).
//
// ONE module feeds BOTH styling worlds:
//   1. `tailwind.config.js` (CommonJS `require`) — every Tailwind colour / radius /
//      shadow class is generated from these values.
//   2. Runtime TS (`import { colors } from "@/theme"`) — react-native-svg icons take a
//      real hex via their `color=` prop (className doesn't reach SVG strokes), and the
//      few RN style objects that need shadows (Android `elevation` + iOS shadow*).
//
// NEVER hardcode a hex anywhere else in the app — if a colour is missing, add it here.
//
// Palette lineage: the seamlessvet-v3 design archive, re-tuned in the MoD design-polish
// milestone. Amber/rose are deliberately MUTED versus the prototype (#F4B400 / #E5484D
// read too loud on device) — and dusted down a second time on user review (2026-06-04:
// "clean and easy on the eyes"). Tune them HERE only and every pill, banner, icon and
// Tailwind class follows. `ink` shades carry text (keep ~4.5:1 on white/soft);
// DEFAULTs are icon/accent duty.

/** Brand + semantic palette. Keys mirror the Tailwind colour names 1:1. */
const colors = {
  teal: {
    50: "#E8F4F6",
    100: "#CFE7EC",
    200: "#A6D4DC",
    400: "#4FA8B6",
    500: "#1A8FA1",
    600: "#0F7A8A",
    700: "#0B6573",
  },
  navy: {
    500: "#5A76A0",
    700: "#3A578A",
    800: "#2C4A7A",
    900: "#223D69",
  },
  ink: {
    50: "#F4F6FA",
    100: "#E6EBF1",
    200: "#CFD7E1",
    300: "#AAB6C5",
    400: "#94A1B5",
    500: "#6B7A92",
    700: "#2A3B52",
    900: "#0E1B2C",
  },
  paper: {
    DEFAULT: "#FFFFFF",
    soft: "#F8FAFB",
  },
  canvas: "#129AAA",
  // Muted semantics (vs prototype amber #F4B400 / red #E5484D — dusty, low saturation).
  amber: {
    DEFAULT: "#B5915A",
    soft: "#F6F1E6",
    ink: "#7C6840",
    border: "#E6DDC8",
  },
  emerald: {
    DEFAULT: "#2BB673",
    soft: "#DEF5E9",
    ink: "#1F8A56",
  },
  rose: {
    DEFAULT: "#A96A6F",
    soft: "#F4EDEE",
    ink: "#8C585C",
  },
  white: "#FFFFFF",
};

/** Corner radii in px (numbers — interpolate `${radius.card}px` for Tailwind). */
const radius = {
  card: 22,
  input: 14,
  chip: 12,
  pill: 999,
};

/**
 * RN shadow style objects (iOS shadow* + Android elevation together — set BOTH or the
 * shadow vanishes on one platform). `card` is the default lift under Card/ListRow/Stat;
 * `pop` is for floating sheets.
 */
const shadow = {
  card: {
    shadowColor: "#0F2A44",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 18,
    elevation: 3,
  },
  pop: {
    shadowColor: "#0F2A44",
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
    elevation: 10,
  },
};

/** CSS box-shadow strings for the Tailwind `shadow-*` classes (iOS side of `shadow`). */
const boxShadow = {
  card: "0 4px 18px rgba(15, 42, 68, 0.08)",
  pop: "0 12px 32px rgba(15, 42, 68, 0.22)",
};

module.exports = { colors, radius, shadow, boxShadow };
