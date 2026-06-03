import { useLocalSearchParams } from "expo-router";

import { StatementScreen } from "@/components/StatementScreen";

/** Mo8.4 — the farm ledger's statement (M16), offline from the synced farm ledger entries. */
export default function FarmStatementScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>();
  return <StatementScreen scope={{ kind: "farm", farmId: farmId ?? "" }} />;
}
