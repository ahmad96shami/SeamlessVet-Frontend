import { useCallback, useRef } from "react";

// A keyboard-wedge scanner emits keystrokes far faster than a human can type — far below this gap.
const FAST_KEY_MS = 40;
// Ignore short, human-typed strings that happen to end with Enter (a barcode is always longer).
const MIN_BARCODE_LEN = 4;
// Share of inter-key gaps that must be machine-fast to call it a scan (tolerates a little USB jitter).
const FAST_RATIO = 0.7;

/**
 * Hardware (keyboard-wedge) barcode-scanner detection for a single text input — WITHOUT breaking
 * normal typing. A USB/Bluetooth scanner types the code as an ultra-fast keystroke burst terminated
 * by Enter; a human types slowly. We watch keystroke *timing*: when an Enter arrives after a burst
 * of fast-typed chars (and the buffer is long enough), it's a scan — `onScan(code)` fires and the
 * Enter is swallowed. Anything typed at human speed has too few fast gaps to qualify and falls
 * through untouched, so the ordinary search keeps working.
 *
 * Returns an `onKeyDown` to spread onto the input. The code is read from the live DOM value
 * (`e.currentTarget.value`), not React state, so it's complete even before a controlled re-render.
 */
export function useBarcodeScan(onScan: (code: string) => void) {
  const lastKeyAt = useRef(0);
  const fastChars = useRef(0); // consecutive printable chars typed at scanner speed

  return useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const now = e.timeStamp; // browser-set, monotonic per event
      if (e.key === "Enter") {
        const code = e.currentTarget.value.trim();
        const fastEnough = fastChars.current >= Math.ceil((code.length - 1) * FAST_RATIO);
        fastChars.current = 0;
        if (code.length >= MIN_BARCODE_LEN && fastEnough) {
          e.preventDefault();
          onScan(code);
        }
        return;
      }
      if (e.key.length === 1) {
        // a printable character
        const gap = now - lastKeyAt.current;
        fastChars.current = gap > 0 && gap < FAST_KEY_MS ? fastChars.current + 1 : 0;
        lastKeyAt.current = now;
      }
    },
    [onScan],
  );
}
