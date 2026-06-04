import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

/**
 * Pulsing list placeholder shown while a query's first result loads — rows
 * mirror ListRow's anatomy (leading tile, title/sub bars, pill bar) as flat
 * bordered cards, so the layout doesn't jump when real rows land.
 *
 * One Reanimated pulse drives the whole list on the UI thread; the
 * Animated.View stays className-free per the design-system rule. `avatar`
 * drops the leading tile for text-only surfaces (notifications, statements).
 */
export function SkeletonList({ rows = 6, avatar = true }: { rows?: number; avatar?: boolean }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - pulse.value * 0.45 }));

  return (
    <Animated.View style={style}>
      <View className="gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <View
            key={i}
            className="bg-paper border-ink-100 rounded-card flex-row items-center gap-3 border p-3.5"
          >
            {avatar ? <View className="bg-ink-100 h-14 w-14 rounded-2xl" /> : null}
            <View className="flex-1 gap-2">
              <View className="bg-ink-100 h-3.5 w-1/2 rounded-pill" />
              <View className="bg-ink-100 h-3 w-3/4 rounded-pill" />
              <View className="bg-ink-100 h-4 w-24 rounded-pill" />
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}
