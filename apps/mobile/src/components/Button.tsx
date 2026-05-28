import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

type Variant = "primary" | "ghost";

interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  loading?: boolean;
}

export function Button({ label, variant = "primary", loading, disabled, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;
  const base = "h-11 items-center justify-center rounded-md px-4";
  const tone =
    variant === "primary"
      ? "bg-teal-600 active:bg-teal-700"
      : "bg-transparent active:bg-slate-100";
  const textTone = variant === "primary" ? "text-white" : "text-teal-700";
  return (
    <Pressable
      disabled={isDisabled}
      className={`${base} ${tone} ${isDisabled ? "opacity-60" : ""}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#0f766e"} />
      ) : (
        <Text className={`text-base font-semibold ${textTone}`}>{label}</Text>
      )}
    </Pressable>
  );
}
