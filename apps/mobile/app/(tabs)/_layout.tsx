import { Easing, I18nManager, useWindowDimensions, View } from "react-native";
import { Tabs, type BottomTabBarProps } from "expo-router/js-tabs";

import { BottomBar, type TabKey } from "@/components/layout";

/**
 * The four primary destinations live in a REAL tab navigator: each screen mounts
 * once (lazily, on first visit) and tab switches are native jumps — no more
 * re-building the whole dashboard on every bottom-bar tap, which is what made
 * navigation feel laggy when the bar was `router.push` over a plain Stack.
 *
 * `freezeOnBlur` keeps the blurred tabs (home's five watched queries!) from
 * re-rendering on every PowerSync tick — same contract as the root Stack.
 */
const KEY_FOR_ROUTE: Record<string, TabKey> = {
  index: "home",
  visits: "visits",
  inventory: "inv",
  me: "me",
};
const ROUTE_FOR_KEY: Record<TabKey, string> = {
  home: "index",
  visits: "visits",
  inv: "inventory",
  me: "me",
};

/**
 * Custom tab bar — the design's BottomBar wrapped in the footer chrome that
 * ScreenShell's footer slot used to own (paper bg, top hairline, bottom inset).
 */
function MoDTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const activeName = state.routes[state.index]?.name ?? "index";
  return (
    <View style={{ paddingBottom: insets.bottom }} className="bg-paper border-ink-100 border-t">
      <BottomBar
        active={KEY_FOR_ROUTE[activeName] ?? "home"}
        onSelect={(key) => {
          const name = ROUTE_FOR_KEY[key];
          const route = state.routes.find((r) => r.name === name);
          if (!route) return;
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (route.key !== state.routes[state.index]?.key && !event.defaultPrevented) {
            navigation.navigate(name);
          }
        }}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  // Direction-aware tab slide (a pager feel; stack pushes keep the root fade).
  // `progress` is signed by relative tab index: -1 = lower index than the focused
  // tab, +1 = higher. RTL is forced, so lower-index tabs sit visually to the
  // RIGHT — going home → visits the incoming scene enters from the left edge and
  // the whole content slides rightward (flip `offset` if the device says otherwise).
  const offset = I18nManager.isRTL ? width : -width;
  return (
    <Tabs
      tabBar={(props) => <MoDTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        transitionSpec: {
          animation: "timing",
          config: { duration: 220, easing: Easing.out(Easing.cubic) },
        },
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [offset, 0, -offset],
                }),
              },
            ],
          },
        }),
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="visits" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
