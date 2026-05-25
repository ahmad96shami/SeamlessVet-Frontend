import type { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Dialog } from "@/components/ui/dialog";

const REGION_ID = "pos-barcode-region";

/**
 * Camera barcode scanner — html5-qrcode is dynamically imported so it stays out of the main bundle
 * and the camera only starts while the dialog is open. On a successful decode it hands the text back
 * (the caller fills the search box). Camera access can't be exercised in the headless smoke.
 */
export function BarcodeScannerDialog({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (text: string) => void;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  // Keep the latest callback without restarting the camera effect.
  const detectedRef = useRef(onDetected);
  detectedRef.current = onDetected;

  useEffect(() => {
    if (!open) return;
    let scanner: Html5Qrcode | null = null;
    let cancelled = false;
    let handled = false;
    setError(null);

    // stop() THROWS synchronously when the scanner isn't running (e.g. the camera never started, or
    // the dialog closed mid-init) — guard both the sync throw and the async rejection.
    const stopSafely = (s: Html5Qrcode) => {
      try {
        const p = s.stop();
        if (p && typeof p.then === "function") {
          void p.then(() => s.clear()).catch(() => {});
        }
      } catch {
        /* not running — nothing to stop */
      }
    };

    void (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const instance = new Html5Qrcode(REGION_ID);
        scanner = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 160 } },
          (decoded) => {
            if (handled) return;
            handled = true;
            detectedRef.current(decoded.trim());
          },
          () => {}, // per-frame "not found" — ignore the noise
        );
        if (cancelled) stopSafely(instance); // dialog closed while the camera was starting
      } catch {
        if (!cancelled) setError(t("pos.search.scanUnavailable"));
      }
    })();

    return () => {
      cancelled = true;
      if (scanner) stopSafely(scanner);
    };
  }, [open, t]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("pos.search.scanTitle")}
      description={t("pos.search.scanHint")}
    >
      <div id={REGION_ID} className="min-h-[240px] overflow-hidden rounded-xl bg-ink-50" />
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </Dialog>
  );
}
