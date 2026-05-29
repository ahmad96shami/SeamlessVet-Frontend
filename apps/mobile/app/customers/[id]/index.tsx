import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { Add, Bird, Briefcase, Cow, Edit, Forward, House, Paper, Receipt, Stethoscope } from "@/components/icons";
import { Button, Card, Money, Pill } from "@/components/ui";
import { ScreenShell, TopBar } from "@/components/layout";
import { useQuery } from "@/sync/hooks";
import type { CustomerRow, PetRow, VisitRow } from "@/sync/types";
import { formatDate } from "@vet/shared";

interface LedgerRow {
  id: string;
  customer_id: string;
  balance: number;
  status: string;
  updated_at: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  poultry_farm: <Bird size={20} color="#0F7A8A" />,
  cattle_farm: <Cow size={20} color="#0F7A8A" />,
  regular_farm: <Briefcase size={20} color="#0F7A8A" />,
  home: <House size={20} color="#0F7A8A" />,
};

export default function CustomerDetailScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: customers } = useQuery<CustomerRow>(
    `SELECT * FROM customers WHERE id = ?`,
    [id ?? ""],
  );
  const { data: pets } = useQuery<PetRow>(
    `SELECT * FROM pets WHERE customer_id = ? ORDER BY updated_at DESC`,
    [id ?? ""],
  );
  const { data: recentVisits } = useQuery<VisitRow>(
    `SELECT * FROM visits WHERE customer_id = ? ORDER BY started_at DESC LIMIT 5`,
    [id ?? ""],
  );
  const { data: ledgers } = useQuery<LedgerRow>(
    `SELECT * FROM ledgers WHERE customer_id = ?`,
    [id ?? ""],
  );

  const customer = customers?.[0];
  const ledger = ledgers?.[0];

  if (!customer) {
    return (
      <ScreenShell
        header={<TopBar title={t("customers.notFound")} onBack={() => router.back()} right={null} />}
      >
        <View className="items-center pt-12">
          <Text className="text-ink-500 text-[14px] font-tajawal">{t("customers.notFound")}</Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      header={
        <TopBar
          title={customer.full_name}
          onBack={() => router.back()}
          right={
            <Pressable
              onPress={() => router.push(`/customers/${customer.id}/edit`)}
              accessibilityRole="button"
              className="h-9 w-9 items-center justify-center"
            >
              <Edit size={20} color="#223D69" />
            </Pressable>
          }
        />
      }
    >
      <Card className="flex-row items-center gap-3 p-4">
        <View className="bg-teal-50 h-14 w-14 items-center justify-center rounded-card">
          {TYPE_ICON[customer.type] ?? <House size={22} color="#0F7A8A" />}
        </View>
        <View className="flex-1 gap-1.5">
          <Text className="text-navy-900 text-[17px] font-tajawal-extrabold" numberOfLines={1}>
            {customer.full_name}
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            <Pill tone="neutral" label={t(`customerType.${customer.type}`)} />
            {customer.phone_primary ? (
              <Pill tone="teal" label={customer.phone_primary} />
            ) : null}
          </View>
        </View>
      </Card>

      {ledger ? (
        <Card flat className="mt-3 flex-row items-center justify-between p-3">
          <View className="gap-0.5">
            <Text className="text-ink-500 text-[12px] font-tajawal">
              {t(`ledgerStatus.${ledger.status}`)}
            </Text>
            <Money value={ledger.balance} />
          </View>
        </Card>
      ) : null}

      <View className="mt-5 gap-2">
        <Button
          label={t("visits.new")}
          variant="teal"
          block
          leadingIcon={<Stethoscope size={18} color="#FFFFFF" />}
          onPress={() => router.push({ pathname: "/visits/new", params: { customerId: customer.id } })}
        />
        <Button
          label={t("billing.actions.openVoucher")}
          variant="soft"
          block
          leadingIcon={<Receipt size={18} color="#223D69" />}
          onPress={() => router.push(`/customers/${customer.id}/voucher`)}
        />
        <Button
          label={t("billing.actions.openStatement")}
          variant="ghost"
          block
          leadingIcon={<Paper size={18} color="#223D69" />}
          onPress={() => router.push(`/customers/${customer.id}/statement`)}
        />
        {customer.type !== "home" ? (
          <Button
            label={t("finance.contracts.new")}
            variant="ghost"
            block
            leadingIcon={<Briefcase size={18} color="#223D69" />}
            onPress={() =>
              router.push({ pathname: "/contracts/new", params: { customerId: customer.id } })
            }
          />
        ) : null}
      </View>

      {(recentVisits ?? []).length > 0 ? (
        <View className="mt-6 gap-2">
          <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
            {t("nav.visits")}
          </Text>
          {(recentVisits ?? []).map((v) => (
            <Pressable
              key={v.id}
              onPress={() => router.push({ pathname: "/visits/[id]", params: { id: v.id } })}
            >
              <Card className="flex-row items-center gap-3 p-3">
                <View className="bg-teal-50 h-10 w-10 items-center justify-center rounded-card">
                  <Stethoscope size={18} color="#0F7A8A" />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                    {v.visit_number ?? t("visits.noNumber")}
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    <Pill tone="neutral" label={t(`visitStatus.${v.status}`)} />
                    {v.started_at ? (
                      <Pill tone="neutral" label={formatDate(v.started_at, i18n.resolvedLanguage)} />
                    ) : null}
                  </View>
                </View>
                <Forward size={18} color="#94A1B5" />
              </Card>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="mt-6 flex-row items-center justify-between">
        <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
          {t("customers.pets.title")}
        </Text>
        <Pressable
          onPress={() => router.push(`/customers/${customer.id}/pets/new`)}
          className="bg-navy-900 active:bg-navy-800 flex-row items-center gap-1.5 rounded-pill px-3 py-1.5"
        >
          <Add size={14} color="#FFFFFF" />
          <Text className="text-paper text-[12px] font-tajawal-bold">
            {t("customers.pets.new")}
          </Text>
        </Pressable>
      </View>

      <View className="mt-3 gap-2">
        {(pets ?? []).length === 0 ? (
          <Card flat className="p-4">
            <Text className="text-ink-500 text-center text-[13px] font-tajawal">
              {t("customers.pets.empty")}
            </Text>
          </Card>
        ) : (
          (pets ?? []).map((pet) => (
            <Pressable
              key={pet.id}
              onPress={() => router.push(`/customers/${customer.id}/pets/${pet.id}`)}
            >
              <Card className="flex-row items-center gap-3 p-3">
                <View className="bg-ink-50 h-10 w-10 items-center justify-center rounded-card">
                  <Text className="text-navy-900 text-[15px] font-tajawal-extrabold">
                    {pet.name.charAt(0)}
                  </Text>
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-navy-900 text-[14px] font-tajawal-extrabold" numberOfLines={1}>
                    {pet.name}
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {pet.species ? <Pill tone="neutral" label={pet.species} /> : null}
                    {pet.breed ? <Pill tone="neutral" label={pet.breed} /> : null}
                    {pet.sex ? <Pill tone="teal" label={t(`petSex.${pet.sex}`)} /> : null}
                  </View>
                </View>
                <Forward size={18} color="#94A1B5" />
              </Card>
            </Pressable>
          ))
        )}
      </View>
    </ScreenShell>
  );
}
