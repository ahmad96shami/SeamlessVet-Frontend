import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { activateContract, type ApiError } from "@vet/shared";

import { Send, Shield } from "@/components/icons";
import { Button, Card } from "@/components/ui";
import { canActivateContracts } from "@/lib/permissions";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";
import { useSyncStore } from "@/stores/syncStore";
import type { ContractRow } from "@/sync/types";
import { syncDelete } from "@/sync/writes";
import { colors } from "@/theme";

/**
 * Lifecycle actions for a contract (Mo5.4). Mirrors the web's gate but adapted to the field app:
 *
 * - **Draft:** an activation-gate panel explains that field visits bill at catalog prices until
 *   activation, and that activation is `contracts.activate` + online-only. The doctor can **discard**
 *   the draft (a soft delete via `/sync/contracts` — offline-capable, device-authoritative). The
 *   **Activate** button only appears when the role may activate (admin/accountant) and is disabled
 *   offline; otherwise the panel says the permission is required (activation is office/web work).
 *   Editing is via the detail's pencil.
 * - **Active:** terms are read-only on the device (server-authoritative, PRD §8.4). The doctor can
 *   **propose an amendment** — start a new draft pre-filled from this contract's terms; the office
 *   reviews and activates it.
 * - **Completed / cancelled:** read-only, no actions.
 */
export function ContractLifecycleActions({ contract }: { contract: ContractRow }) {
  const router = useRouter();
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const online = useSyncStore((s) => s.online);
  const [busy, setBusy] = useState(false);

  const isDraft = contract.status === "draft";
  const isActive = contract.status === "active";
  if (!isDraft && !isActive) return null; // terminal contracts are read-only

  const canActivate = canActivateContracts(role);

  const doActivate = () => {
    Alert.alert(t("finance.lifecycle.activateTitle"), t("finance.lifecycle.activateBody"), [
      { text: t("actions.cancel"), style: "cancel" },
      {
        text: t("finance.lifecycle.activate"),
        onPress: async () => {
          setBusy(true);
          try {
            // Online-only, server-confirmed (never queued); the server flips status→active and
            // PowerSync streams the updated row back, refreshing the detail a moment later.
            await activateContract(apiClient, contract.id);
          } catch (err) {
            Alert.alert(t("finance.lifecycle.activate"), (err as ApiError).message ?? "Failed");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const doDiscard = () => {
    Alert.alert(t("finance.lifecycle.discard"), t("finance.lifecycle.discardConfirm"), [
      { text: t("actions.cancel"), style: "cancel" },
      {
        text: t("finance.lifecycle.discard"),
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await syncDelete("contracts", contract.id);
            router.back();
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const proposeAmendment = () => {
    router.push({
      pathname: "/contracts/new",
      params: {
        customerId: contract.customer_id,
        periodStart: contract.period_start ?? "",
        periodEnd: contract.period_end ?? "",
        totalPrice: contract.total_price != null ? String(contract.total_price) : "",
        expectedVisitCount:
          contract.expected_visit_count != null ? String(contract.expected_visit_count) : "",
        animalType: contract.animal_type ?? "",
        animalCount: contract.animal_count != null ? String(contract.animal_count) : "",
      },
    });
  };

  return (
    <View className="mt-6 gap-3">
      {isDraft ? (
        <>
          <Card flat className="bg-amber-soft gap-1.5 p-3">
            <View className="flex-row items-center gap-2">
              <Shield size={16} color={colors.amber.ink} />
              <Text className="text-amber-ink text-[13px] font-tajawal-extrabold">
                {t("finance.lifecycle.gateTitle")}
              </Text>
            </View>
            <Text className="text-amber-ink text-[12px] font-tajawal">
              {t("finance.lifecycle.gateHint")} {t("finance.lifecycle.activateBody")}
            </Text>
            <Text className="text-amber-ink text-[12px] font-tajawal-bold">
              {canActivate ? t("finance.lifecycle.activatedByYou") : t("finance.lifecycle.needPermission")}
              {"  ·  "}
              {t("finance.lifecycle.onlineOnly")}
            </Text>
          </Card>

          {canActivate ? (
            <Button
              label={t("finance.lifecycle.activate")}
              variant="primary"
              block
              leadingIcon={<Shield size={18} color={colors.white} />}
              onPress={doActivate}
              loading={busy}
              disabled={!online}
            />
          ) : null}

          <Button
            label={t("finance.lifecycle.discard")}
            variant="ghost"
            block
            onPress={doDiscard}
            loading={busy}
          />
        </>
      ) : null}

      {isActive ? (
        <Card flat className="gap-2 p-3">
          <Text className="text-ink-700 text-[13px] font-tajawal">
            {t("finance.contracts.proposeAmendmentHint")}
          </Text>
          <Button
            label={t("finance.contracts.proposeAmendment")}
            variant="soft"
            block
            leadingIcon={<Send size={18} color={colors.navy[900]} />}
            onPress={proposeAmendment}
          />
        </Card>
      ) : null}
    </View>
  );
}
