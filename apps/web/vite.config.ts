import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      // Prompt (not autoUpdate): a silent reload could interrupt a form or an in-flight sync, so
      // the user chooses when to apply an update (W7 — services/pwa.ts surfaces the toast).
      registerType: "prompt",
      manifest: {
        name: "نظام إدارة العيادة البيطرية",
        short_name: "VetSystem",
        description: "Center Web App — operations, admin & POS",
        lang: "ar",
        dir: "rtl",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#0f766e",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
      // Precache the app shell + static assets so the UI boots offline. API reads are cached
      // separately by the TanStack Query persister (W7.4) — not via Workbox runtime caching —
      // so there's one source of truth for read freshness/invalidation.
      workbox: {
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { 
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
    '/api': {
      target: 'http://localhost:5180', // your backend port
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(/^\/api/, ''), // strips /api prefix
    },
   },
   },
});

//  server: { 
//     port: 5173,},
//    },