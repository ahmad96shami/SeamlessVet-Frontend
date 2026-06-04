import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

/**
 * The design's bottom sheet shell — a dim backdrop that FADES in place and a
 * paper panel that SLIDES up from the bottom, animated as two separate layers.
 *
 * Never reach for `Modal animationType="slide"` instead: RN slides the whole
 * modal subtree, so the full-screen scrim visibly rides up with the panel.
 * Here the Modal mounts with no animation and one Animated progress value
 * drives backdrop opacity + panel translateY (native driver); on close the
 * exit animation finishes before the Modal unmounts.
 *
 * Tapping the backdrop closes. The panel caps at 80% of the window height —
 * give scrollable content its own ScrollView (`className="grow-0"`).
 */
interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, children }: SheetProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [visible, setVisible] = useState(open);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        // Interrupted (re-opened mid-close) → stay mounted.
        if (finished) setVisible(false);
      });
    }
  }, [open, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [windowHeight, 0],
  });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        {/* Backdrop layer — fades, never moves. */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
          <Pressable className="bg-ink-900/50 flex-1" onPress={onClose} />
        </Animated.View>
        {/* Panel layer — slides. Animated.Views stay className-free (style-only);
            the inner View carries the design classes. */}
        <Animated.View style={{ transform: [{ translateY }] }}>
          <View
            className="bg-paper rounded-t-card px-5 pb-8 pt-4"
            style={{ maxHeight: windowHeight * 0.8 }}
          >
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
