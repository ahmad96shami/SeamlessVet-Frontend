// Typed gateway to the design-system tokens (MoD.1). Import from "@/theme" in app code:
//
//   import { colors, shadow } from "@/theme";
//   <Stethoscope size={18} color={colors.teal[600]} />
//
// `tokens.js` stays CommonJS so `tailwind.config.js` can `require` the same values —
// the Tailwind classes and these runtime constants can never drift apart.
export { colors, radius, shadow, boxShadow } from "./tokens";
