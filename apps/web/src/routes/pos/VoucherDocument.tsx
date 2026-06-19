import { formatCurrency, formatDateTime, type ReceiptVoucherResponse } from "@vet/shared";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { useCenterName } from "@/hooks/useCenterName";

export interface VoucherDocumentProps {
  voucher: ReceiptVoucherResponse;
  customerName: string | null;
}

function Divider() {
  return <div className="my-1 border-t border-dashed border-black/40" />;
}

/**
 * 80mm printable receipt voucher (Sanad Qabd) — acknowledges a payment received from a customer.
 * Rendered off-screen; `react-to-print` clones it at 80mm. RTL Arabic, self-contained.
 */
export const VoucherDocument = forwardRef<HTMLDivElement, VoucherDocumentProps>(
  function VoucherDocument({ voucher, customerName }, ref) {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const centerName = useCenterName();
    const number = `#${voucher.id.slice(0, 8)}`;
    const row = "flex justify-between gap-2";

    return (
      <div
        ref={ref}
        dir="rtl"
        className="bg-white text-black"
        style={{ width: "80mm", padding: "4mm", fontFamily: "Tajawal, sans-serif", fontSize: 12, lineHeight: 1.6 }}
      >
        <div className="text-center">
          <div className="text-base font-extrabold" dir="auto">{centerName}</div>
        </div>
        <div className="my-1 text-center text-sm font-bold">{t("pos.voucher.receiptTitle")}</div>

        <Divider />
        <div className={row}>
          <span>{t("pos.voucher.voucherNo")}</span>
          <span dir="ltr">{number}</span>
        </div>
        <div className={row}>
          <span>{t("pos.receipt.date")}</span>
          <span dir="ltr">{formatDateTime(voucher.issuedAt, lang)}</span>
        </div>

        <Divider />
        <div className="mb-1">
          <span className="text-muted-foreground">{t("pos.voucher.receivedFrom")}: </span>
          <span className="font-semibold" dir="auto">{customerName ?? "—"}</span>
        </div>
        <div className={`${row} text-sm font-bold`}>
          <span>{t("pos.voucher.theSum")}</span>
          <span className="tabular-nums">{formatCurrency(voucher.amount, lang)}</span>
        </div>
        <div className={row}>
          <span>{t("pos.voucher.via")}</span>
          <span>{t(`paymentMethod.${voucher.method}`, { defaultValue: voucher.method })}</span>
        </div>
        {voucher.notes ? <div className="mt-1 whitespace-pre-wrap text-[11px]">{voucher.notes}</div> : null}

        <Divider />
        <div className="mt-4 text-[11px]">{t("pos.voucher.signature")}: ____________</div>
      </div>
    );
  },
);
