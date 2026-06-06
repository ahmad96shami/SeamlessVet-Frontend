import { useRouter } from "expo-router";

import { BottomBar } from "./BottomBar";

/**
 * Route-aware wrapper around {@link BottomBar} for STACK screens that sit above the
 * `(tabs)` navigator but still show the bar (contracts, customers). The four real tab
 * screens get their bar from the navigator's custom `tabBar` — never render this there.
 * `active` keeps the visually-nearest tab selected.
 */
type TabKey = "home" | "visits" | "inv" | "me";

const ROUTE: Record<TabKey, string> = {
  home: "/",
  visits: "/visits", // Mo2.6 lands the local visits list behind the Visits tab.
  inv: "/inventory",
  me: "/me", // MoD.7 — profile + general settings (sign-out lives here).
};

interface NavBottomBarProps {
  active: TabKey;
}

export function NavBottomBar({ active }: NavBottomBarProps) {
  const router = useRouter();
  return (
    <BottomBar
      active={active}
      onSelect={(key) => {
        if (key === active) return;
        const route = ROUTE[key];
        // `navigate`, not `push`: the tab destinations live in the `(tabs)` navigator
        // below this stack screen — navigate pops back to it and switches the tab
        // instead of stacking a duplicate copy of the whole screen.
        router.navigate(route as never);
      }}
    />
  );
}
