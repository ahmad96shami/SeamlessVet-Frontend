import { type ReactNode } from "react";
import { Text, View } from "react-native";

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

/** Form field shell: label on top, child input, optional inline error. */
export function Field({ label, error, children }: FieldProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-sm font-medium text-slate-700">{label}</Text>
      {children}
      {error ? <Text className="mt-1 text-xs text-rose-600">{error}</Text> : null}
    </View>
  );
}
