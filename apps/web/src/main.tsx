import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/App";
import { Providers } from "@/app/providers";
import { registerPwa } from "@/services/pwa";
import "@/index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

createRoot(rootEl).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);

// Service worker + install prompt. After render, so the toast surface is mounted (the SW
// update/offline-ready callbacks fire async, well after the first paint).
registerPwa();
