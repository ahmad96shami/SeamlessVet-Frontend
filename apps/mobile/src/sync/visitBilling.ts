/**
 * Field-billing helpers — Mo4.
 *
 * The mobile field invoice posts to `/visits/{id}/field-invoice` with `items: []` and lets
 * the server auto-assemble the visit's unbilled `dispensed_to_owner` prescriptions + billable
 * procedures (M7 task 8). Contract pricing is applied server-side. So this module's job is
 * **preview only** — render an estimated total, drive the Mo3.3 negative-stock guard, and
 * tell the doctor what they're about to bill. The server stays the single source of truth
 * for money and inventory deltas; if the doctor double-issues, its auto-assembler skips
 * already-invoiced prescription/procedure ids and returns "nothing to bill" cleanly.
 */

import type { FieldStockLine } from "@/sync/fieldInventory";
import type { ProcedureRow, PrescriptionRow } from "@/sync/types";

export interface BillablePrescriptionLine {
  prescriptionId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface BillableProcedureLine {
  procedureId: string;
  serviceId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface FieldBillingPreview {
  prescriptions: BillablePrescriptionLine[];
  procedures: BillableProcedureLine[];
  subtotal: number;
}

interface ProductLookup {
  id: string;
  name_ar: string | null;
  selling_price: number | null;
}

interface ServiceLookup {
  id: string;
  name_ar: string | null;
  default_price: number | null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Build the preview from the local rows + catalog snapshot. Pure function — easy to test. */
export function buildFieldBillingPreview(
  prescriptions: ReadonlyArray<PrescriptionRow>,
  procedures: ReadonlyArray<ProcedureRow>,
  productsById: ReadonlyMap<string, ProductLookup>,
  servicesById: ReadonlyMap<string, ServiceLookup>,
): FieldBillingPreview {
  const rxLines: BillablePrescriptionLine[] = [];
  for (const rx of prescriptions) {
    if (rx.dispense_type !== "dispensed_to_owner") continue;
    const product = productsById.get(rx.product_id);
    const qty = rx.quantity ?? 1;
    const price = product?.selling_price ?? 0;
    rxLines.push({
      prescriptionId: rx.id,
      productId: rx.product_id,
      productName: product?.name_ar ?? "—",
      quantity: qty,
      unitPrice: price,
      lineTotal: round2(qty * price),
    });
  }

  const procLines: BillableProcedureLine[] = [];
  for (const proc of procedures) {
    const service = proc.service_id ? servicesById.get(proc.service_id) : null;
    const price = proc.price ?? service?.default_price ?? 0;
    procLines.push({
      procedureId: proc.id,
      serviceId: proc.service_id,
      description: service?.name_ar ?? "—",
      quantity: 1,
      unitPrice: price,
      lineTotal: round2(price),
    });
  }

  const subtotal = round2(
    rxLines.reduce((sum, l) => sum + l.lineTotal, 0) +
      procLines.reduce((sum, l) => sum + l.lineTotal, 0),
  );
  return { prescriptions: rxLines, procedures: procLines, subtotal };
}

/** Apply a flat invoice discount (capped at subtotal). The server re-computes; this is preview only. */
export function applyDiscount(subtotal: number, discount: number): number {
  if (!Number.isFinite(discount) || discount <= 0) return subtotal;
  return round2(Math.max(0, subtotal - discount));
}

/** Stock lines that need to be guarded (Mo3.3). Only product rows from prescriptions. */
export function stockGuardLines(preview: FieldBillingPreview): FieldStockLine[] {
  return preview.prescriptions.map((line) => ({
    productId: line.productId,
    productName: line.productName,
    requestedQty: line.quantity,
  }));
}
