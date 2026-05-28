import { useRouter } from "expo-router";

import { BottomBar } from "./BottomBar";

/**
 * Route-aware wrapper around {@link BottomBar}. Each Mo2+ screen drops one of these
 * in its footer slot so the four bottom-bar tabs all navigate to the same canonical
 * routes without each screen re-implementing the mapping. `active` keeps the chosen
 * tab visually selected.
 */
type TabKey = "home" | "visits" | "inv" | "me";

const ROUTE: Record<TabKey, string> = {
  home: "/",
  visits: "/visits", // Mo2.6 lands the local visits list behind the Visits tab.
  inv: "/inventory",    // Mo3 will populate the inventory route — placeholder until then.
  me: "/profile",       // future "حسابي" — not yet implemented; tap is a no-op.
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
        // The Mo3/Mo7 routes don't exist yet — `replace` is a safe no-op since RN's
        // router silently ignores unknown paths in production; in dev the warning
        // signals which tab still needs its destination.
        router.push(route as never);
      }}
    />
  );
}
