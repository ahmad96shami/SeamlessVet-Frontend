import { useEffect, useState } from "react";
import { InteractionManager } from "react-native";

/**
 * False for the screen's first frames, true once pending interactions (the tab
 * slide's Animated timing, the press's touch turn) have drained.
 *
 * Gate expensive list commits behind it so a lazy first mount stays cheap: the
 * skeleton rides through the enter transition and the real rows commit right
 * after, instead of contending with the animation (see the visits tab).
 */
export function useScreenSettled(): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setSettled(true));
    return () => task.cancel();
  }, []);
  return settled;
}
