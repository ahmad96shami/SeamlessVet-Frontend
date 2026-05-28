/** @type {import('tailwindcss').Config} */
//
// SeamlessVet Field — design tokens ported from the design archive's styles.css
// (seamlessvet-v3). Token names match the source's CSS-var palette so a designer
// reading the design and a developer reading the code refer to the same colours.
//
// Shadows: RN flattens compound CSS box-shadow into a single iOS shadow / Android
// elevation. We pick the *visually dominant* layer from the design's --shadow-card
// and --shadow-pop so cards still feel lifted without trying to fake the second
// layer at runtime.
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
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
        amber: {
          DEFAULT: "#F4B400",
          soft: "#FFF6DD",
          ink: "#8A6A00",
        },
        emerald: {
          DEFAULT: "#2BB673",
          soft: "#DEF5E9",
          ink: "#1F8A56",
        },
        rose: {
          DEFAULT: "#E5484D",
          soft: "#FBE4E5",
          ink: "#B33235",
        },
      },
      borderRadius: {
        card: "22px",
        chip: "12px",
        input: "14px",
        pill: "999px",
      },
      boxShadow: {
        // Single-layer approximation of styles.css --shadow-card.
        card: "0 4px 18px rgba(15, 42, 68, 0.06)",
        pop: "0 12px 32px rgba(15, 42, 68, 0.18)",
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
