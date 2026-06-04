import { useMemo, useState } from "react";
import { ScrollView, Share, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery as useApiQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import * as Linking from "expo-linking";
import { formatDate, getFarmStatement, getStatement, type StatementResponse } from "@vet/shared";

import { Send } from "@/components/icons";
import {
  Button,
  Card,
  Divider,
  InfoBanner,
  Money,
  Photo,
  photoKindForCustomerType,
  photoKindForFarmKind,
  Pill,
  Voucher,
} from "@/components/ui";
import { Footer, ScreenShell, TopBar } from "@/components/layout";
import { formatAmount } from "@/lib/numerals";
import { apiClient } from "@/services/apiClient";
import { dialog } from "@/stores/dialogStore";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow, FarmRow, LedgerEntryRow, LedgerRow } from "@/sync/types";
import { colors } from "@/theme";

/** Whose ledger the statement renders (M16 — customer XOR farm, ck_ledgers_owner). */
export type StatementScope =
  | { kind: "customer"; customerId: string }
  | { kind: "farm"; farmId: string };

/**
 * Mo4.5 customer statement, generalised over the M16 polymorphic ledger (Mo8.4 — the same
 * move web W11 made on `StatementSection`).
 *
 * Renders **offline-first** from the on-device `ledger_entries` mirror — each row carries the
 * server-computed `balance_after` (signed-amount running balance) so the offline render is one
 * for one with the server's. When online the same screen fires the authoritative
 * `GET /customers/{id}/statement` or `GET /farms/{id}/statement` through TanStack Query and
 * prefers the server's view if it lands.
 *
 * Both scope branches' watched queries always run (hook rules); the inactive one is disabled
 * by an empty id, the W11 null-id pattern. WhatsApp routes to the *owning customer's* phone in
 * both scopes. Print stays deferred with the Bluetooth-printer Open Decision (Mo4.4).
 */
export function StatementScreen({ scope }: { scope: StatementScope }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [sharing, setSharing] = useState<"whatsapp" | "share" | null>(null);

  const customerId = scope.kind === "customer" ? scope.customerId : "";
  const farmId = scope.kind === "farm" ? scope.farmId : "";

  const { data: farms } = useQuery<FarmRow>(`SELECT * FROM farms WHERE id = ?`, [farmId]);
  const farm = farms?.[0];

  // Customer scope reads it directly; farm scope resolves the owner through the farm row.
  const { data: customers } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [scope.kind === "customer" ? customerId : (farm?.customer_id ?? "")],
  );
  const customer = customers?.[0];

  const { data: ledgers } = useQuery<LedgerRow>(
    scope.kind === "customer"
      ? `SELECT * FROM ledgers WHERE customer_id = ?`
      : `SELECT * FROM ledgers WHERE farm_id = ?`,
    [scope.kind === "customer" ? customerId : farmId],
  );
  const ledger = ledgers?.[0];

  const { data: localEntries } = useQuery<LedgerEntryRow>(
    `SELECT * FROM ledger_entries WHERE ledger_id = ? ORDER BY created_at ASC`,
    [ledger?.id ?? ""],
  );

  // Online reconcile. Cached; falls back silently to the local render when offline (the
  // request just fails). The `enabled` guard skips the fetch until the owner id resolves.
  const serverQuery = useApiQuery<StatementResponse>({
    queryKey: scope.kind === "customer" ? ["customer-statement", customerId] : ["farm-statement", farmId],
    queryFn: () =>
      scope.kind === "customer"
        ? getStatement(apiClient, customerId)
        : getFarmStatement(apiClient, farmId),
    enabled: scope.kind === "customer" ? customerId.length > 0 : farmId.length > 0,
    staleTime: 30_000,
  });

  // The displayed/share name: the farm for a farm statement (the server's farmName), else the
  // customer. The owner row still feeds the WhatsApp phone in both scopes.
  const ownerName =
    scope.kind === "farm"
      ? (serverQuery.data?.farmName ?? farm?.name ?? "")
      : (serverQuery.data?.customerName ?? customer?.full_name ?? "");

  // Prefer the server's view (more authoritative, includes opening/closing). Fall back to
  // a constructed shape from the local mirror so the offline render is identical.
  const view = useMemo<StatementShape | null>(() => {
    if (serverQuery.data) {
      return {
        openingBalance: serverQuery.data.openingBalance,
        closingBalance: serverQuery.data.closingBalance,
        entries: serverQuery.data.entries.map((e) => ({
          id: e.id,
          createdAt: e.createdAt,
          entryType: e.entryType,
          amount: e.amount,
          balanceAfter: e.balanceAfter,
          description: e.description ?? null,
        })),
        source: "server",
      };
    }
    if (ledger && localEntries) {
      return {
        openingBalance: 0,
        closingBalance: ledger.balance,
        entries: localEntries.map((e) => ({
          id: e.id,
          createdAt: e.created_at,
          entryType: e.entry_type,
          amount: e.amount,
          balanceAfter: e.balance_after,
          description: e.description,
        })),
        source: "local",
      };
    }
    return null;
  }, [serverQuery.data, ledger, localEntries]);

  const ready = scope.kind === "customer" ? !!customer : !!farm;
  if (!ready) {
    const notFound =
      scope.kind === "farm" ? t("customers.farmDetail.notFound") : t("customers.notFound");
    return (
      <ScreenShell
        header={<TopBar title={notFound} onBack={() => router.back()} right={null} />}
      >
        <View className="items-center pt-12">
          <Text className="text-ink-500 text-[14px] font-tajawal">{notFound}</Text>
        </View>
      </ScreenShell>
    );
  }

  const composeMessage = (statement: StatementShape, lang: string | undefined): string => {
    const lines: string[] = [];
    lines.push(t("statement.shareHeader", { name: ownerName }));
    lines.push(t("statement.opening", { value: statement.openingBalance.toFixed(2) }));
    for (const e of statement.entries) {
      lines.push(
        `${formatDate(e.createdAt, lang)}  ${t(`ledgerEntryType.${e.entryType}`, e.entryType)}  ${e.amount.toFixed(2)}  →  ${e.balanceAfter.toFixed(2)}`,
      );
    }
    lines.push(t("statement.closing", { value: statement.closingBalance.toFixed(2) }));
    return lines.join("\n");
  };

  const onShareWhatsApp = async () => {
    if (!view) return;
    setSharing("whatsapp");
    try {
      const message = composeMessage(view, i18n.resolvedLanguage);
      const phone = (customer?.phone_primary ?? "").replace(/\D/g, "");
      const url = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        void dialog.alert(t("statement.shareUnavailable"));
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      void dialog.alert(t("statement.shareFailed"), (err as Error).message);
    } finally {
      setSharing(null);
    }
  };

  const onSystemShare = async () => {
    if (!view) return;
    setSharing("share");
    try {
      const message = composeMessage(view, i18n.resolvedLanguage);
      await Share.share({ message });
    } catch (err) {
      void dialog.alert(t("statement.shareFailed"), (err as Error).message);
    } finally {
      setSharing(null);
    }
  };

  // The design's stat trio — debits raise what the customer owes, credits settle it.
  const totals = view
    ? view.entries.reduce(
        (acc, e) => {
          if (e.amount >= 0) acc.debit += e.amount;
          else acc.credit += -e.amount;
          return acc;
        },
        { debit: 0, credit: 0 },
      )
    : { debit: 0, credit: 0 };

  const photoKind =
    scope.kind === "farm"
      ? photoKindForFarmKind(farm?.kind)
      : photoKindForCustomerType(customer?.type);

  return (
    <ScreenShell
      header={<TopBar title={t("statement.title")} onBack={() => router.back()} right={null} />}
      footer={
        <Footer>
          <Button
            label={t("statement.share")}
            variant="soft"
            onPress={onSystemShare}
            loading={sharing === "share"}
            style={{ flex: 1 }}
          />
          <Button
            label={t("statement.shareWhatsApp")}
            leadingIcon={<Send size={16} color={colors.white} />}
            onPress={onShareWhatsApp}
            loading={sharing === "whatsapp"}
            style={{ flex: 1.2 }}
          />
        </Footer>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-3.5 pb-6">
          {/* Ticket header */}
          <Voucher>
            <View className="flex-row gap-3">
              <Photo kind={photoKind} size={56} />
              <View className="min-w-0 flex-1">
                <Text className="text-navy-900 text-[18px] font-tajawal-extrabold" numberOfLines={1}>
                  {ownerName}
                </Text>
                {scope.kind === "farm" && customer ? (
                  <Text className="text-ink-500 mt-0.5 text-[13px] font-tajawal" numberOfLines={1}>
                    {t("customers.farmDetail.owner")}: {customer.full_name}
                  </Text>
                ) : null}
                <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                  {ledger?.status ? (
                    <Pill
                      compact
                      tone={ledger.status === "open" ? "amber" : "neutral"}
                      label={t(`ledgerStatus.${ledger.status}`, { defaultValue: ledger.status })}
                    />
                  ) : null}
                  <Pill
                    compact
                    tone={view?.source === "server" ? "teal" : "neutral"}
                    label={
                      view?.source === "server"
                        ? t("statement.sourceServer")
                        : t("statement.sourceLocal")
                    }
                  />
                </View>
              </View>
            </View>
          </Voucher>

          {/* Stat trio — مدين / دائن / الرصيد */}
          {view ? (
            <View className="flex-row gap-2.5">
              <Card className="flex-1 items-center gap-1 p-3">
                <Text className="text-ink-500 text-[12px] font-tajawal">
                  {t("statement.totalDebit")}
                </Text>
                <Money value={totals.debit} className="text-rose text-[18px]" />
              </Card>
              <Card className="flex-1 items-center gap-1 p-3">
                <Text className="text-ink-500 text-[12px] font-tajawal">
                  {t("statement.totalCredit")}
                </Text>
                <Money value={totals.credit} className="text-emerald text-[18px]" />
              </Card>
              <Card className="bg-navy-900 flex-1 items-center gap-1 p-3">
                <Text className="text-paper/70 text-[12px] font-tajawal">
                  {t("statement.balance")}
                </Text>
                <Money value={view.closingBalance} className="text-paper text-[18px]" />
              </Card>
            </View>
          ) : null}

          {/* Entries */}
          <Card className="p-3.5">
            <Text className="text-navy-900 mb-1 text-[15px] font-tajawal-extrabold">
              {t("statement.entriesTitle")}
            </Text>
            {!view ? (
              <Text className="text-ink-500 text-[13px] font-tajawal">{t("actions.loading")}</Text>
            ) : view.entries.length === 0 ? (
              <Text className="text-ink-500 py-3 text-[13px] font-tajawal">
                {t("statement.empty")}
              </Text>
            ) : (
              view.entries.map((e, i) => (
                <View key={e.id}>
                  {i > 0 ? <Divider dashed /> : null}
                  <View className="flex-row items-center justify-between py-1.5">
                    <View className="min-w-0 flex-1 gap-0.5 pe-2">
                      <Text className="text-ink-900 text-[14px] font-tajawal-bold" numberOfLines={1}>
                        {e.description ?? t(`ledgerEntryType.${e.entryType}`, e.entryType)}
                      </Text>
                      <Text className="text-ink-500 text-[12px] font-tajawal">
                        {formatDate(e.createdAt, i18n.resolvedLanguage)}
                        {e.description ? ` · ${t(`ledgerEntryType.${e.entryType}`, e.entryType)}` : ""}
                      </Text>
                    </View>
                    <Text
                      className={`text-[14px] font-tajawal-extrabold ${
                        e.amount >= 0 ? "text-rose" : "text-emerald"
                      }`}
                    >
                      {e.amount >= 0 ? "−" : "+"}
                      {formatAmount(Math.abs(e.amount))}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Card>

          <InfoBanner tone="neutral">{t("statement.settlementNote")}</InfoBanner>
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

interface StatementShape {
  openingBalance: number;
  closingBalance: number;
  entries: Array<{
    id: string;
    createdAt: string;
    entryType: string;
    amount: number;
    balanceAfter: number;
    description: string | null;
  }>;
  source: "server" | "local";
}
