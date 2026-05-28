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
}: {
  value: number;
  currency?: string;
  className?: string;
}) {
  const { i18n } = useTranslation();
  const { body, symbol } = formatCurrencyParts(value, i18n.language, currency);
  return (
    <span className={cn("money tabular-nums", className)}>
      <span className="money-body">{body}</span>
      {symbol ? <span className="money-symbol">{symbol}</span> : null}
    </span>
  );
}
