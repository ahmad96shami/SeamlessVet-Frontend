import { View, type ViewProps } from "react-native";

import { Card } from "./Card";

/**
 * The design's ticket card — a normal Card with two circular side cut-outs, used
 * for document-like headers (the statement / كشف حساب header). The cut-out
 * circles are painted in the page background colour so they read as punched
 * holes; `cutoutClassName` overrides when the screen background isn't ink-50.
 */
interface VoucherProps extends ViewProps {
  cutoutClassName?: string;
}

export function Voucher({
  cutoutClassName = "bg-ink-50",
  className,
  children,
  ...rest
}: VoucherProps) {
  return (
    <View className={`relative ${className ?? ""}`} {...rest}>
      <Card className="p-[18px]">{children}</Card>
      <View
        className={`${cutoutClassName} absolute -start-[11px] top-1/2 -mt-[11px] h-[22px] w-[22px] rounded-pill`}
      />
      <View
        className={`${cutoutClassName} absolute -end-[11px] top-1/2 -mt-[11px] h-[22px] w-[22px] rounded-pill`}
      />
    </View>
  );
}
