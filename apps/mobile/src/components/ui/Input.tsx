import { forwardRef, useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { colors } from "@/theme";

/**
 * The design's `.input` — paper-backed, hairline border (`ink-100`), 14-px
 * rounded corners, teal focus ring (mimicked here with a 1-px teal border +
 * `ring-2 ring-teal-50` halo). Field label on top, optional inline error below.
 *
 * Mirrors the existing TextField+Field combo but co-locates them into one
 * primitive so screens write `<Input label="…" error={…} value={…} />` instead
 * of two nested components.
 */
interface InputProps extends Omit<TextInputProps, "placeholderTextColor"> {
  label?: string;
  error?: string;
  hint?: string;
  /** Element rendered inside the input on the start side (e.g., a country prefix). */
  leading?: React.ReactNode;
  /** Element rendered inside the input on the end side (e.g., a clear / visibility toggle). */
  trailing?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, leading, trailing, onFocus, onBlur, style, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const borderTone = error
    ? "border-rose"
    : focused
      ? "border-teal-500"
      : "border-ink-100";
  return (
    <View>
      {label ? (
        <Text className="text-ink-700 mb-2 text-[13px] font-tajawal-bold">{label}</Text>
      ) : null}
      <View
        className={`bg-paper flex-row items-center gap-2 rounded-input border px-3 ${borderTone}`}
      >
        {leading}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.ink[400]}
          className="text-ink-900 flex-1 py-3.5 text-[15px] font-tajawal"
          style={style}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {trailing}
      </View>
      {error ? (
        <Text className="text-rose-ink mt-1 text-[12px] font-tajawal-bold">{error}</Text>
      ) : hint ? (
        <Text className="text-ink-500 mt-1 text-[12px] font-tajawal">{hint}</Text>
      ) : null}
    </View>
  );
});
