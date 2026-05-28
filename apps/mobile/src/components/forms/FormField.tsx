import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Input } from "@/components/ui";

/**
 * RHF-bound wrapper around {@link Input}. Saves the visit/customer/pet forms from
 * repeating the same Controller-render-error scaffold per field.
 *
 * `transform.toString` / `transform.fromString` cover the number → input-text and back
 * case (weight, vitals); without them the value is treated as a string.
 */
interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words";
  transform?: {
    toString: (raw: unknown) => string;
    fromString: (text: string) => unknown;
  };
}

const numberTransform = {
  toString: (raw: unknown) => (typeof raw === "number" ? String(raw) : (raw as string | undefined) ?? ""),
  fromString: (text: string) => {
    if (text.trim() === "") return undefined;
    const n = Number(text);
    return Number.isFinite(n) ? n : undefined;
  },
};

export const NumberFieldTransform = numberTransform;

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  placeholder,
  multiline,
  keyboardType = "default",
  autoCapitalize = "sentences",
  transform,
}: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          label={label}
          placeholder={placeholder}
          hint={hint}
          error={fieldState.error?.message}
          value={transform ? transform.toString(field.value) : ((field.value as string | undefined) ?? "")}
          onChangeText={(text) => field.onChange(transform ? transform.fromString(text) : text)}
          onBlur={field.onBlur}
          multiline={multiline}
          numberOfLines={multiline ? 3 : undefined}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={multiline ? { minHeight: 84, textAlignVertical: "top" } : undefined}
        />
      )}
    />
  );
}
