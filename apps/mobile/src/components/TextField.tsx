import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";

/**
 * NativeWind-styled text input. Forwarded ref so react-hook-form's controllers
 * can wire focus management later.
 */
export const TextField = forwardRef<TextInput, TextInputProps>(function TextField(props, ref) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor="#94a3b8"
      className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900"
      {...props}
    />
  );
});
