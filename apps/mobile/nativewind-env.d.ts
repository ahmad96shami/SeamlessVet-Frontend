/// <reference types="nativewind/types" />

// Tailwind's global.css is consumed via NativeWind's Metro transformer — TS
// sees the bare side-effect import, so declare it as an empty module.
declare module "*.css";
