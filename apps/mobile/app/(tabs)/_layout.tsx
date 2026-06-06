import { View } from "react-native";
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
  // No tab animation — perf experiment: isolate switch cost from the slide.
  return (
    <Tabs
      tabBar={(props) => <MoDTabBar {...props} />}
      screenOptions={{ headerShown: false, freezeOnBlur: true }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="visits" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
