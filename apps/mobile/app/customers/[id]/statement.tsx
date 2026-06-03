import { useLocalSearchParams } from "expo-router";

import { StatementScreen } from "@/components/StatementScreen";

/** Mo4.5 — the customer's OWN ledger statement (post-M16: farm charges live on farm ledgers). */
export default function CustomerStatementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StatementScreen scope={{ kind: "customer", customerId: id ?? "" }} />;
}
