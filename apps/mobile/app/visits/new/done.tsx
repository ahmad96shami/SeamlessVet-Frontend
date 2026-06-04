import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { Check } from "@/components/icons";
import { Footer, ScreenShell, TopBar } from "@/components/layout";
import { Button, Card, Divider, Money, StateHero } from "@/components/ui";
import { useVisitWizardStore } from "@/stores/visitWizardStore";
import { colors } from "@/theme";

/**
 * Wizard success screen (MoD.5) — the design's "تم تسجيل الزيارة" state. Reads
 * the confirm summary left in the wizard store; the CTAs reset the wizard and
 * hand off (receipt voucher = the existing Mo4.4 screen).
 */
export default function WizardDoneScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const result = useVisitWizardStore((s) => s.result);
  const reset = useVisitWizardStore((s) => s.reset);

  const exitHome = () => {
    reset();
    router.replace("/");
  };

  return (
    <ScreenShell
      header={<TopBar title="" onBack={exitHome} right={null} />}
      footer={
        <Footer>
          <Button
            label={t("nav.visits")}
            variant="soft"
            style={{ flex: 1 }}
            onPress={() => {
              reset();
              router.replace("/visits");
            }}
          />
          <Button
            label={t("visits.wizard.issueVoucher")}
            style={{ flex: 1.2 }}
            onPress={() => {
              const customerId = result?.customerId;
              reset();
              if (customerId) {
                router.replace({
                  pathname: "/customers/[id]/voucher" as never,
                  params: { id: customerId },
                } as never);
              } else {
                router.replace("/customers");
              }
            }}
          />
        </Footer>
      }
    >
      <View className="items-center px-2 pt-4">
        <StateHero
          tone="green"
          icon={<Check size={56} color={colors.emerald.ink} />}
          title={t("visits.wizard.doneTitle")}
          body={t("visits.wizard.doneBody")}
        />

        <Card className="mt-6 w-full p-3.5">
          <SummaryRow label={t("visits.create.customer")} value={result?.customerName ?? "—"} />
          <Divider dashed />
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-ink-500 text-[13px] font-tajawal">
              {t("visits.wizard.estimatedTotal")}
            </Text>
            <Money value={result?.total ?? 0} />
          </View>
          <Divider dashed />
          <SummaryRow
            label={t("visits.wizard.visitNumber")}
            value={result?.visitNumber ?? t("visits.noNumber")}
          />
        </Card>
      </View>
    </ScreenShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-ink-500 text-[13px] font-tajawal">{label}</Text>
      <Text className="text-navy-900 text-[13px] font-tajawal-bold" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
