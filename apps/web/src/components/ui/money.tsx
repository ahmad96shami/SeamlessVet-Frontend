import { DEFAULT_CURRENCY, formatCurrencyParts } from "@vet/shared";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * Render a money amount with the currency symbol visually de-emphasised — smaller and slightly
 * lighter than the digit body. Use this anywhere a currency string was previously rendered as
 * JSX content; for plain-string contexts (print/PDF templates, interpolations) keep using
 * `formatCurrency` directly.
 */
export function Money({
  value,
  currency = DEFAULT_CURRENCY,
  className,
  symbolPlacement = "leading",
}: {
  value: number;
  currency?: string;
  className?: string;
  /**
   * Where to render the currency symbol relative to the amount. Default leading — in the RTL
   * layout the symbol then sits visually to the LEFT of the digits (the app-wide convention,
   * matching the customers/suppliers/purchases list columns).
   */
  symbolPlacement?: "leading" | "trailing";
}) {
  const { i18n } = useTranslation();
  const { body, symbol } = formatCurrencyParts(value, i18n.language, currency);
  const symbolNode = symbol ? <span className="money-symbol">{symbol}</span> : null;
  return (
    <span className={cn("money tabular-nums", className)}>
      {symbolPlacement === "leading" ? symbolNode : null}
      <span className="money-body">{body}</span>
      {symbolPlacement === "trailing" ? symbolNode : null}
    </span>
  );
}
