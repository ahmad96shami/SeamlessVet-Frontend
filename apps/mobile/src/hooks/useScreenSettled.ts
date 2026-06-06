import { useEffect, useState } from "react";
import { useNavigation } from "expo-router";

/**
 * False while the screen's enter transition is still running, true once the
 * navigator reports it finished (`transitionEnd` — native-stack fires it from
 * the native appear event, bottom-tabs around its slide timing). The fallback
 * timer covers mounts that animate nothing, where the event never fires.
 *
 * Gate expensive list commits behind it so a fresh mount stays cheap: the
 * skeleton rides through the push/slide and the real rows commit right after,
 * instead of contending with the animation (see the visits tab).
 */
export function useScreenSettled(): boolean {
  const navigation = useNavigation();
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const settle = () => setSettled(true);
    const unsubscribe = navigation.addListener("transitionEnd" as never, settle as never);
    const fallback = setTimeout(settle, 400);
    return () => {
      unsubscribe();
      clearTimeout(fallback);
    };
  }, [navigation]);
  return settled;
}
