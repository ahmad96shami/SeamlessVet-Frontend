import { useEffect, useState } from "react";

/**
 * False for the screen's very first frame, true from the next frame on.
 *
 * Gate expensive list commits behind it so a fresh mount paints something
 * immediately (the skeleton), then commits the real rows one frame later —
 * the tap → screen-on-screen delay stays minimal even for heavy lists.
 *
 * (Navigation animations are currently OFF; when they come back, this can wait
 * for the navigator's `transitionEnd` instead — but never on a long fallback:
 * a stalled event would park every gated screen on its skeleton.)
 */
export function useScreenSettled(): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return settled;
}
