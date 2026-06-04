/** @type {import('tailwindcss').Config} */
//
// SeamlessVet Field — Tailwind classes are GENERATED from the design-system token
// module (MoD.1). `src/theme/tokens.js` is the single source of truth shared with
// runtime code (react-native-svg `color=` props, RN shadow styles): edit colours /
// radii / shadows THERE, never here.
//
// Shadows: RN flattens compound CSS box-shadow into a single iOS shadow / Android
// elevation. `boxShadow` carries the iOS-side string; components add the Android
// `elevation` via the token `shadow` style objects.
const { colors, radius, boxShadow } = require("./src/theme/tokens");

module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        teal: colors.teal,
        navy: colors.navy,
        ink: colors.ink,
        paper: colors.paper,
        canvas: colors.canvas,
        amber: colors.amber,
        emerald: colors.emerald,
        rose: colors.rose,
      },
      borderRadius: {
        card: `${radius.card}px`,
        chip: `${radius.chip}px`,
        input: `${radius.input}px`,
        pill: `${radius.pill}px`,
      },
      boxShadow: {
        card: boxShadow.card,
        pop: boxShadow.pop,
      },
      fontFamily: {
        // Tajawal loaded via expo-font in DF.2; the stack falls back to system
        // until the font is ready (one frame on cold start).
        tajawal: ["Tajawal", "System"],
        "tajawal-bold": ["Tajawal_700Bold", "System"],
        "tajawal-extrabold": ["Tajawal_800ExtraBold", "System"],
      },
    },
  },
  plugins: [],
};
