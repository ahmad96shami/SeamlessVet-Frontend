import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CUSTOMER_TYPE_VALUES,
  CustomerRequestSchema,
  type CustomerRequest,
  type CustomerType,
} from "@vet/shared";

import { Bird, Briefcase, Cow, House } from "@/components/icons";
import { Button } from "@/components/ui";
import { ChipSelect, FormField } from "@/components/forms";
import { omitEmptyStrings } from "@/lib/forms";

const TYPE_ICONS: Record<CustomerType, React.ReactNode> = {
  poultry_farm: <Bird size={14} color="#0E1B2C" />,
  cattle_farm: <Cow size={14} color="#0E1B2C" />,
  regular_farm: <Briefcase size={14} color="#0E1B2C" />,
  home: <House size={14} color="#0E1B2C" />,
};

interface CustomerFormProps {
  defaultValues?: Partial<CustomerRequest>;
  submitting?: boolean;
  submitLabel: string;
  /** Called with a cleaned payload (empty optional strings stripped) — pass to syncInsert/syncUpdate. */
  onSubmit: (values: CustomerRequest) => Promise<void> | void;
}

/**
 * Shared create + edit form for an on-site customer (PRD §4 Part 2). RHF + Zod against the
 * shared `CustomerRequestSchema`, so the same field rules the web/admin uses apply offline on
 * the field doctor's device. Optional empty strings are stripped at submit so the row stores
 * `null` rather than `""` (matches web's `omitEmptyStrings` convention).
 */
export function CustomerForm({
  defaultValues,
  submitting,
  submitLabel,
  onSubmit,
}: CustomerFormProps) {
  const { t } = useTranslation();
  const form = useForm<CustomerRequest>({
    resolver: zodResolver(CustomerRequestSchema),
    defaultValues: {
      type: defaultValues?.type ?? "regular_farm",
      fullName: defaultValues?.fullName ?? "",
      phonePrimary: defaultValues?.phonePrimary ?? "",
      phoneSecondary: defaultValues?.phoneSecondary ?? "",
      address: defaultValues?.address ?? "",
      email: defaultValues?.email ?? "",
      idNumber: defaultValues?.idNumber ?? "",
      notes: defaultValues?.notes ?? "",
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
      <ChipSelect
        control={form.control}
        name="type"
        label={t("customers.type")}
        options={CUSTOMER_TYPE_VALUES.map((v) => ({
          value: v,
          label: t(`customerType.${v}`),
          leadingIcon: TYPE_ICONS[v],
        }))}
      />
      <FormField
        control={form.control}
        name="fullName"
        label={t("customers.fullName")}
      />
      <FormField
        control={form.control}
        name="phonePrimary"
        label={t("customers.phonePrimary")}
        keyboardType="phone-pad"
        autoCapitalize="none"
      />
      <FormField
        control={form.control}
        name="phoneSecondary"
        label={t("customers.phoneSecondary")}
        keyboardType="phone-pad"
        autoCapitalize="none"
      />
      <FormField control={form.control} name="address" label={t("customers.address")} />
      <FormField
        control={form.control}
        name="email"
        label={t("customers.email")}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <FormField
        control={form.control}
        name="idNumber"
        label={t("customers.idNumber")}
        autoCapitalize="none"
      />
      <FormField
        control={form.control}
        name="notes"
        label={t("customers.notes")}
        multiline
      />

      <View className="mt-2">
        <Button label={submitLabel} onPress={handleSubmit} loading={submitting} block />
      </View>
    </View>
  );
}
