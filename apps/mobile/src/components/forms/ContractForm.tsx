import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ContractCreateRequestSchema, type ContractCreateRequest } from "@vet/shared";

import { Button } from "@/components/ui";
import { FormField, NumberFieldTransform } from "@/components/forms";
import { omitEmptyStrings } from "@/lib/forms";

interface ContractFormProps {
  /** The customer this contract is for — fixed by the screen (picked or passed in) before the form renders. */
  customerId: string;
  defaultValues?: Partial<ContractCreateRequest>;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: ContractCreateRequest) => Promise<void> | void;
}

/** Today as `YYYY-MM-DD` — the natural default start for a freshly authored contract. */
function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Shared create + edit form for a farm-supervision contract's *terms* (Mo5.1). The customer is
 * fixed by the screen and the responsible doctor is always the logged-in field doctor, so neither
 * is an editable field here — the form captures only the negotiable terms (period, value, expected
 * visits, animal type/count).
 *
 * Validates against the shared `ContractCreateRequestSchema` (the same rules the web/admin uses),
 * so a draft authored offline carries the identical shape the server accepts on `/sync/contracts`.
 * Dates are plain `YYYY-MM-DD` text (the Mo2 convention — no native date-picker dep); numeric
 * fields use `NumberFieldTransform` so an empty input is `undefined`, not `NaN`.
 */
export function ContractForm({
  customerId,
  defaultValues,
  submitting,
  submitLabel,
  onSubmit,
}: ContractFormProps) {
  const { t } = useTranslation();
  const form = useForm<ContractCreateRequest>({
    resolver: zodResolver(ContractCreateRequestSchema),
    defaultValues: {
      customerId,
      periodStart: defaultValues?.periodStart ?? todayYmd(),
      periodEnd: defaultValues?.periodEnd ?? "",
      totalPrice: defaultValues?.totalPrice,
      expectedVisitCount: defaultValues?.expectedVisitCount,
      animalType: defaultValues?.animalType ?? "",
      animalCount: defaultValues?.animalCount,
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(omitEmptyStrings(values));
    } catch (err) {
      Alert.alert(t("actions.save"), (err as Error).message ?? "Save failed");
    }
  });

  return (
    <View className="gap-4">
      <FormField
        control={form.control}
        name="periodStart"
        label={t("finance.contracts.periodStart")}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      <FormField
        control={form.control}
        name="periodEnd"
        label={t("finance.contracts.periodEnd")}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      <FormField
        control={form.control}
        name="totalPrice"
        label={t("finance.contracts.totalPrice")}
        keyboardType="decimal-pad"
        transform={NumberFieldTransform}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormField
            control={form.control}
            name="expectedVisitCount"
            label={t("finance.contracts.expectedVisitCount")}
            keyboardType="numeric"
            transform={NumberFieldTransform}
          />
        </View>
        <View className="flex-1">
          <FormField
            control={form.control}
            name="animalCount"
            label={t("finance.contracts.animalCount")}
            keyboardType="numeric"
            transform={NumberFieldTransform}
          />
        </View>
      </View>
      <FormField
        control={form.control}
        name="animalType"
        label={t("finance.contracts.animalType")}
        placeholder={t("finance.contracts.animalTypePlaceholder")}
      />

      <View className="mt-2">
        <Button label={submitLabel} onPress={handleSubmit} loading={submitting} block />
      </View>
    </View>
  );
}
