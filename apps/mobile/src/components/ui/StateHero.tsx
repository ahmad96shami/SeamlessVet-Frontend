import { Text, View, type ViewProps } from "react-native";

/**
 * The design's full-screen state header — a dashed ring around a tinted circle
 * holding a big icon, then a 22/800 title and a soft body line. Used for
 * success ("تم تسجيل الزيارة"), pending-approval ("حسابك قيد المراجعة") and
 * rich empty states.
 *
 * The caller renders the icon (and picks its colour from `@/theme`); the tone
 * here only tints the ring + circle.
 */
type Tone = "teal" | "green" | "amber" | "red";

interface StateHeroProps extends ViewProps {
  icon: React.ReactNode;
  title: string;
  body?: string;
}

const TONE: Record<Tone, { ring: string; circle: string }> = {
  teal: { ring: "border-teal-200", circle: "bg-teal-50" },
  green: { ring: "border-emerald/40", circle: "bg-emerald-soft" },
  amber: { ring: "border-amber/40", circle: "bg-amber-soft" },
  red: { ring: "border-rose/40", circle: "bg-rose-soft" },
};

export function StateHero({
  icon,
  title,
  body,
  tone = "teal",
  className,
  children,
  ...rest
}: StateHeroProps & { tone?: Tone }) {
  const palette = TONE[tone];
  return (
    <View className={`items-center ${className ?? ""}`} {...rest}>
      <View
        className={`${palette.ring} h-[126px] w-[126px] items-center justify-center rounded-pill border-2 border-dashed`}
      >
        <View
          className={`${palette.circle} h-[110px] w-[110px] items-center justify-center rounded-pill`}
        >
          {icon}
        </View>
      </View>
      <Text className="text-navy-900 mb-1.5 mt-[18px] text-center text-[22px] font-tajawal-extrabold">
        {title}
      </Text>
      {body ? (
        <Text className="text-ink-500 text-center text-[14px] leading-6 font-tajawal">{body}</Text>
      ) : null}
      {children}
    </View>
  );
}
