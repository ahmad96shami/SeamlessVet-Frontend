import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

import i18n from "@/i18n";

/** The non-standard install-prompt event (not in lib.dom yet). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Wire the PWA service worker and the install prompt. Called once at boot.
 *   - a new SW waiting → a sticky toast offering reload (prompt mode, never auto-reload);
 *   - first offline-readiness → a one-off success toast;
 *   - the browser's `beforeinstallprompt` → a toast whose action triggers the native install.
 * In dev (SW disabled) `registerSW` is a no-op stub, so this is safe to call everywhere.
 */
export function registerPwa(): void {
  const t = i18n.t.bind(i18n);

  const updateSW = registerSW({
    onNeedRefresh() {
      toast(t("pwa.updateTitle"), {
        description: t("pwa.updateBody"),
        duration: Infinity,
        action: { label: t("pwa.reload"), onClick: () => void updateSW(true) },
      });
    },
    onOfflineReady() {
      toast.success(t("pwa.offlineReady"));
    },
  });

  let deferredInstall: BeforeInstallPromptEvent | null = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // suppress the mini-infobar; we offer install on our terms
    deferredInstall = event as BeforeInstallPromptEvent;
    toast(t("pwa.installTitle"), {
      action: {
        label: t("pwa.install"),
        onClick: () => {
          void deferredInstall?.prompt();
          deferredInstall = null;
        },
      },
    });
  });
}
