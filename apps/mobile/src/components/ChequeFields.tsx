import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui";

/**
 * Cheque reference fields (Mo9.4 / M19) — revealed by the billing screens only while
 * `method === "cheque"` and cleared on switch-away, mirroring web W14. A cheque settles
 * immediately (it's in IMMEDIATE_PAYMENT_METHODS — no clearing lifecycle; a bounce is a
 * manual ledger adjustment), so this is pure reference metadata and every field is
 * optional server-side.
 */
export interface ChequeDetails {
  chequeNumber: string;
  chequeBank: string;
  chequeDueDate: string;
}

export const EMPTY_CHEQUE: ChequeDetails = { chequeNumber: "", chequeBank: "", chequeDueDate: "" };

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A non-empty due date must be `YYYY-MM-DD` (DateOnly) or the server 400s — gate submit on it. */
export function chequeDetailsValid(method: string, value: ChequeDetails): boolean {
  if (method !== "cheque") return true;
  const due = value.chequeDueDate.trim();
  return due === "" || DATE_ONLY.test(due);
}

/** The request-level trio — `{}` unless paying by cheque; blanks become `undefined`. */
export function chequeRequestFields(
  method: string,
  value: ChequeDetails,
): { chequeNumber?: string; chequeBank?: string; chequeDueDate?: string } {
  if (method !== "cheque") return {};
  return {
    chequeNumber: value.chequeNumber.trim() || undefined,
    chequeBank: value.chequeBank.trim() || undefined,
    chequeDueDate: value.chequeDueDate.trim() || undefined,
  };
}

interface ChequeFieldsProps {
  value: ChequeDetails;
  onChange: (next: ChequeDetails) => void;
}

export function ChequeFields({ value, onChange }: ChequeFieldsProps) {
  const { t } = useTranslation();
  const dueInvalid = !chequeDetailsValid("cheque", value);

  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <View className="flex-1 gap-1.5">
          <Text className="text-ink-700 text-[13px] font-tajawal-bold">{t("cheque.number")}</Text>
          <Input
            value={value.chequeNumber}
            onChangeText={(chequeNumber) => onChange({ ...value, chequeNumber })}
            autoCapitalize="none"
          />
        </View>
        <View className="flex-1 gap-1.5">
          <Text className="text-ink-700 text-[13px] font-tajawal-bold">{t("cheque.bank")}</Text>
          <Input
            value={value.chequeBank}
            onChangeText={(chequeBank) => onChange({ ...value, chequeBank })}
          />
        </View>
      </View>
      <View className="gap-1.5">
        <Text className="text-ink-700 text-[13px] font-tajawal-bold">{t("cheque.dueDate")}</Text>
        <Input
          value={value.chequeDueDate}
          onChangeText={(chequeDueDate) => onChange({ ...value, chequeDueDate })}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />
        {dueInvalid ? (
          <Text className="text-red-600 text-[12px] font-tajawal">YYYY-MM-DD</Text>
        ) : null}
      </View>
    </View>
  );
}
