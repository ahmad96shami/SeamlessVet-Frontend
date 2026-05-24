import { defineConfig } from "tsup";

// One entry per public subpath (mirrors the package.json "exports" map).
// tsup preserves the directory structure under dist/, externalises every
// dependency + peerDependency (axios, zod, react, @tanstack/react-query, …),
// and emits both ESM (.js) and CJS (.cjs) + d.ts.
export default defineConfig({
  entry: [
    "src/index.ts",
    "src/types/index.ts",
    "src/enums/index.ts",
    "src/schemas/index.ts",
    "src/i18n/index.ts",
    "src/formatters/index.ts",
    "src/constants/index.ts",
    "src/http/index.ts",
    "src/offline/index.ts",
    "src/api/index.ts",
    "src/queries/index.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  outDir: "dist",
});
