import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  Add,
  Box,
  Briefcase,
  Paper,
  Receipt,
  Syringe,
  Truck,
  User,
  Warn,
} from "@/components/icons";
import { NavBottomBar, ScreenShell } from "@/components/layout";
import { NotificationBell } from "@/components/NotificationBell";
import { SyncIndicator } from "@/components/SyncIndicator";
import { SyncReviewSheet } from "@/components/SyncReviewSheet";
import {
  Card,
  Divider,
  IconTile,
  ListRow,
  Pill,
  QuickAction,
  SectionTitle,
  Stat,
  TimeBox,
} from "@/components/ui";
import { toArabicDigits } from "@/lib/numerals";
import { useAuthStore } from "@/stores/authStore";
import {
  classifyStock,
  daysUntil,
  FIELD_STOCK_SQL,
  type FieldStockRow,
} from "@/sync/fieldInventory";
import { useQuery } from "@/sync/hooks";
import type { VaccinationRow, VisitRow } from "@/sync/types";
import { colors } from "@/theme";

interface ScheduleRow extends VisitRow {
  customer_name: string | null;
  pet_name: string | null;
}

interface ReminderRow extends VaccinationRow {
  customer_name: string | null;
  pet_name: string | null;
}

/**
 * The field doctor's dashboard (MoD.4) — the design's home: greeting header,
 * live stat cards, quick actions, today's schedule and vaccination reminders.
 * Everything reads offline from local SQLite; the sync pill + bell stay live.
 */
export default function Index() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [reviewOpen, setReviewOpen] = useState(false);

  // -- Stat sources (A.1) -----------------------------------------------------
  const { data: stockRows = [] } = useQuery<FieldStockRow>(FIELD_STOCK_SQL);
  const { data: settingsRows = [] } = useQuery<{ expiration_warning_days: number | null }>(
    `SELECT expiration_warning_days FROM system_settings LIMIT 1`,
  );
  const expirationWarningDays = settingsRows[0]?.expiration_warning_days ?? null;
  const lowCount = useMemo(
    () =>
      stockRows.filter((r) => {
        const s = classifyStock(r, { expirationWarningDays });
        return s === "low" || s === "out";
      }).length,
    [stockRows, expirationWarningDays],
  );
  const { data: voucherRows = [] } = useQuery<{ n: number }>(
    `SELECT COUNT(*) AS n FROM receipt_vouchers
      WHERE date(issued_at, 'localtime') = date('now', 'localtime')`,
  );

  // -- Today's schedule = today's local visits (appointments are clinic-only) --
  const { data: todayVisits = [] } = useQuery<ScheduleRow>(
    `SELECT v.*, c.full_name AS customer_name, pe.name AS pet_name
       FROM visits v
       LEFT JOIN customers c ON c.id = v.customer_id
       LEFT JOIN pets pe ON pe.id = v.pet_id
      WHERE date(COALESCE(v.started_at, v.created_at), 'localtime') = date('now', 'localtime')
      ORDER BY COALESCE(v.started_at, v.created_at) ASC
      LIMIT 6`,
  );
  const nextVisitId = todayVisits.find((v) => v.status === "open")?.id;

  // -- Vaccination reminders (Mo7's source, soonest 3) -------------------------
  const { data: reminders = [] } = useQuery<ReminderRow>(
    `SELECT vx.*, pe.name AS pet_name, c.full_name AS customer_name
       FROM vaccinations vx
       LEFT JOIN pets pe ON pe.id = vx.pet_id
       LEFT JOIN customers c ON c.id = COALESCE(vx.customer_id, pe.customer_id)
      WHERE vx.next_due_date IS NOT NULL AND vx.next_due_date >= date('now', '-7 days')
      ORDER BY vx.next_due_date ASC, vx.id
      LIMIT 3`,
  );

  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <ScreenShell
      header={<HomeHeader greeting={t(`dashboard.greeting.${greetingKey}`)} name={user?.fullName ?? ""} onOpenSync={() => setReviewOpen(true)} />}
      footer={<NavBottomBar active="home" />}
    >
      {/* Stat row */}
      <View className="flex-row gap-2.5">
        <Stat
          icon={<Box size={18} color={colors.teal[600]} />}
          value={toArabicDigits(stockRows.length)}
          label={t("dashboard.stats.stockItems")}
        />
        <Stat
          icon={<Warn size={18} color={colors.amber.DEFAULT} />}
          tone="amber"
          value={toArabicDigits(lowCount)}
          label={t("dashboard.stats.belowThreshold")}
        />
        <Stat
          icon={<Receipt size={18} color={colors.emerald.ink} />}
          tone="green"
          value={toArabicDigits(voucherRows[0]?.n ?? 0)}
          label={t("dashboard.stats.todayVouchers")}
        />
      </View>

      {/* Quick actions */}
      <SectionTitle title={t("dashboard.quickActionsTitle")} />
      <View className="gap-2.5">
        <View className="flex-row gap-2.5">
          <QuickAction
            label={t("dashboard.actions.newVisit")}
            icon={<Add size={20} color={colors.white} />}
            primary
            // MoD.5 lands the guided wizard at /visits/new; until then the flow
            // starts from the customer picker exactly like the old home.
            onPress={() => router.push("/customers")}
          />
          <QuickAction
            label={t("dashboard.actions.loadInventory")}
            icon={<Truck size={20} color={colors.teal[600]} />}
            onPress={() => router.push("/inventory")}
          />
          <QuickAction
            label={t("dashboard.actions.receiptVoucher")}
            icon={<Receipt size={20} color={colors.teal[600]} />}
            onPress={() => router.push("/customers")}
          />
          <QuickAction
            label={t("dashboard.actions.statement")}
            icon={<Paper size={20} color={colors.teal[600]} />}
            onPress={() => router.push("/customers")}
          />
        </View>
        <View className="flex-row gap-2.5">
          <QuickAction
            label={t("nav.customers")}
            icon={<User size={20} color={colors.teal[600]} />}
            onPress={() => router.push("/customers")}
          />
          <QuickAction
            label={t("nav.contracts")}
            icon={<Briefcase size={20} color={colors.teal[600]} />}
            onPress={() => router.push("/contracts")}
          />
          <QuickAction
            label={t("nav.vaccinations")}
            icon={<Syringe size={20} color={colors.teal[600]} />}
            onPress={() => router.push("/vaccinations")}
          />
          <QuickAction
            label={t("dashboard.actions.stockAlerts")}
            icon={<Warn size={20} color={colors.teal[600]} />}
            onPress={() => router.push("/inventory/alerts")}
          />
        </View>
      </View>

      {/* Today's schedule */}
      <SectionTitle
        title={t("dashboard.todaySchedule.title")}
        actionLabel={t("dashboard.viewAll")}
        onAction={() => router.push("/visits")}
      />
      {todayVisits.length === 0 ? (
        <Card flat className="items-center p-5">
          <Text className="text-ink-500 text-[13px] font-tajawal">
            {t("dashboard.todaySchedule.emptyField")}
          </Text>
        </Card>
      ) : (
        <View className="gap-3">
          {todayVisits.map((v) => {
            const isNext = v.id === nextVisitId;
            return (
              <ListRow
                key={v.id}
                onPress={() => router.push({ pathname: "/visits/[id]", params: { id: v.id } })}
              >
                <TimeBox time={timeOf(v.started_at ?? v.created_at)} active={isNext} />
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text
                      className="text-navy-900 shrink text-[15px] font-tajawal-extrabold"
                      numberOfLines={1}
                    >
                      {v.customer_name ?? "—"}
                    </Text>
                    {isNext ? <Pill tone="teal" compact label={t("dashboard.next")} /> : null}
                  </View>
                  {v.chief_complaint ? (
                    <Text className="text-ink-500 mt-0.5 text-[13px] font-tajawal" numberOfLines={1}>
                      {v.chief_complaint}
                    </Text>
                  ) : null}
                  <View className="mt-1.5 flex-row flex-wrap gap-2">
                    <Pill compact label={t(`visitStatus.${v.status}`)} />
                    {v.pet_name ? <Pill compact label={v.pet_name} /> : null}
                    {v.visit_number ? <Pill compact label={v.visit_number} /> : null}
                  </View>
                </View>
              </ListRow>
            );
          })}
        </View>
      )}

      {/* Vaccination reminders */}
      <SectionTitle
        title={t("dashboard.vaxReminders.title")}
        actionLabel={t("dashboard.viewAll")}
        onAction={() => router.push("/vaccinations")}
      />
      {reminders.length === 0 ? (
        <Card flat className="items-center p-5">
          <Text className="text-ink-500 text-[13px] font-tajawal">
            {t("dashboard.vaxReminders.empty")}
          </Text>
        </Card>
      ) : (
        <Card className="p-3.5">
          {reminders.map((r, i) => {
            const days = daysUntil(r.next_due_date);
            const overdue = days !== null && days < 0;
            return (
              <View key={r.id}>
                {i > 0 ? <Divider dashed /> : null}
                <View className="flex-row items-center gap-3 py-1">
                  <IconTile tone={overdue ? "red" : i === 0 ? "amber" : "teal"}>
                    <Syringe
                      size={20}
                      color={
                        overdue
                          ? colors.rose.ink
                          : i === 0
                            ? colors.amber.ink
                            : colors.teal[600]
                      }
                    />
                  </IconTile>
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-navy-900 text-[15px] font-tajawal-extrabold"
                      numberOfLines={1}
                    >
                      {r.vaccine_type}
                      {r.customer_name ? ` — ${r.customer_name}` : ""}
                    </Text>
                    <Text className="text-ink-500 mt-0.5 text-[13px] font-tajawal" numberOfLines={1}>
                      {r.pet_name ? `${r.pet_name} · ` : ""}
                      {dueLabel(t, days)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      <SyncReviewSheet open={reviewOpen} onClose={() => setReviewOpen(false)} />
    </ScreenShell>
  );
}

/** "HH:MM" in device-local time from an ISO timestamp (TimeBox renders the digits Arabic-Indic). */
function timeOf(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dueLabel(t: (key: string, opts?: Record<string, unknown>) => string, days: number | null): string {
  if (days === null) return "";
  if (days < 0) return t("dashboard.vaxReminders.overdue");
  if (days === 0) return t("dashboard.vaxReminders.dueToday");
  return t("dashboard.vaxReminders.dueIn", { count: days });
}

/** The design's greeting header — avatar tile, greeting + name, live sync pill + bell. */
function HomeHeader({
  greeting,
  name,
  onOpenSync,
}: {
  greeting: string;
  name: string;
  onOpenSync: () => void;
}) {
  return (
    <View className="bg-paper border-ink-100 flex-row items-center justify-between border-b px-5 pb-4 pt-3">
      <View className="flex-row items-center gap-3">
        <IconTile tone="teal">
          <User size={22} color={colors.teal[700]} />
        </IconTile>
        <View>
          <Text className="text-ink-500 text-[12px] font-tajawal">{greeting}،</Text>
          <Text className="text-navy-900 text-[16px] font-tajawal-extrabold" numberOfLines={1}>
            {name || "—"}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center gap-2">
        <SyncIndicator onPress={onOpenSync} />
        <NotificationBell />
      </View>
    </View>
  );
}
