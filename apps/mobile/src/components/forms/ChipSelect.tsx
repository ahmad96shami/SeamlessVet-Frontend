import { View, Text } from "react-native";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Chip } from "@/components/ui";

interface Option<V extends string> {
  value: V;
  label: string;
  leadingIcon?: React.ReactNode;
}

interface ChipSelectProps<T extends FieldValues, V extends string> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  options: ReadonlyArray<Option<V>>;
  /** Tint of the active chip. */
  active?: "navy" | "teal";
  /** Render an extra "any/none" option that maps to `undefined`. */
  allowClear?: boolean;
  clearLabel?: string;
}

/**
 * RHF-bound horizontal chip group — used for enum selectors (customer type, pet sex,
 * vaccine type, …). Mirrors the design's row-of-chips pattern in screen-visit.jsx.
 *
 * The chip list wraps onto two lines once the row overflows (matches the on-device
 * keyboard's smaller width and the visit-form review screen's denser layout).
 */
export function ChipSelect<T extends FieldValues, V extends string>({
  control,
  name,
  label,
  options,
  active = "teal",
  allowClear,
  clearLabel = "—",
}: ChipSelectProps<T, V>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View>
          {label ? (
            <Text className="text-ink-700 mb-2 text-[13px] font-tajawal-bold">{label}</Text>
          ) : null}
          <View className="flex-row flex-wrap gap-2">
            {allowClear ? (
              <Chip
                label={clearLabel}
                active={field.value === undefined ? active : "off"}
                onPress={() => field.onChange(undefined)}
              />
            ) : null}
            {options.map((opt) => (
              <Chip
                key={opt.value}
                label={opt.label}
                leadingIcon={opt.leadingIcon}
                active={field.value === opt.value ? active : "off"}
                onPress={() => field.onChange(opt.value)}
              />
            ))}
          </View>
          {fieldState.error ? (
            <Text className="text-rose-ink mt-1 text-[12px] font-tajawal-bold">
              {fieldState.error.message}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}
