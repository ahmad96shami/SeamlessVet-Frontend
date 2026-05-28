/**
 * Field-inventory read helpers — Mo3.
 *
 * The streams in `vet-backend/powersync/sync-rules.yaml` only push `stock_items` rows whose
 * `location_id` belongs to one of THIS doctor's `field_inventories`, with
 * `location_type='field'`. The schema mirror keeps the same shape on-device, so a flat
 * `WHERE location_type='field'` is enough to scope the doctor's "car" — there's no warehouse
 * stock to filter out here.
 *
 * Products live in the `reference` stream (catalog), so an inner join against the local
 * `products` view is safe; a stock row arriving before its product would still render with
 * `name_ar` null (the row just shows "—" until the catalog catches up).
 *
 * Low-stock and expiry rules:
 * - **Low stock**: `quantity < reorder_point` (the universal "time to reorder" threshold).
 *   The system_settings `low_stock_threshold_pct` is the *warning band* — once `quantity`
 *   drops below `reorder_point * (1 + threshold_pct/100)` the row is on the warning list.
 *   We use the practical default: `quantity <= reorder_point`; products with no
 *   reorder_point set (`0`) never count as low (admin hasn't configured the threshold).
 * - **Expiring soon**: `expiration_date` within `expiration_warning_days` from today; rows
 *   already past expiry surface as `expired`.
 * - **Out of stock**: `quantity <= 0`.
 *
 * The Mo3 plan calls these out as exit criteria and Mo7 will wire them into push
 * notifications. For now the screen surfaces them inline as alerts and as status pills on
 * each row.
 */

export type StockStatus = "ok" | "low" | "out" | "expiringSoon" | "expired";

/** A stock_items row enriched with product fields used by the inventory screen. */
export interface FieldStockRow {
  id: string;
  product_id: string;
  location_id: string;
  quantity: number;
  updated_at: string | null;
  /** Joined from the local `products` view; nullable if the catalog hasn't streamed yet. */
  name_ar: string | null;
  name_latin: string | null;
  category: string | null;
  unit_of_measure: string | null;
  reorder_point: number | null;
  expiration_date: string | null;
  selling_price: number | null;
}

export const FIELD_STOCK_SQL = `
  SELECT
    s.id            AS id,
    s.product_id    AS product_id,
    s.location_id   AS location_id,
    s.quantity      AS quantity,
    s.updated_at    AS updated_at,
    p.name_ar       AS name_ar,
    p.name_latin    AS name_latin,
    p.category      AS category,
    p.unit_of_measure AS unit_of_measure,
    p.reorder_point AS reorder_point,
    p.expiration_date AS expiration_date,
    p.selling_price AS selling_price
  FROM stock_items s
  LEFT JOIN products p ON p.id = s.product_id
  WHERE s.location_type = 'field'
  ORDER BY (CASE WHEN s.quantity <= 0 THEN 0 ELSE 1 END),
           (CASE WHEN p.reorder_point > 0 AND s.quantity <= p.reorder_point THEN 0 ELSE 1 END),
           p.name_ar
` as const;

/** SQL pulling the most recent load_to_field movement timestamp into this doctor's car. */
export const LAST_LOADED_AT_SQL = `
  SELECT MAX(created_at) AS last_loaded_at
  FROM inventory_movements
  WHERE movement_type = 'load_to_field' AND to_location_type = 'field'
` as const;

/**
 * Classify a stock row against the system_settings thresholds. Pure function — the screen
 * memoises it across rows and the Mo3.3 negative-stock guard composes with it for the
 * issuance preview's local block (see `evaluateStockStatus` callsite).
 *
 * `expirationWarningDays` falls back to 30 (the SCHEMA default) if settings haven't
 * streamed yet, so the field doctor still gets *some* expiry warnings on a fresh device.
 */
export function classifyStock(
  row: FieldStockRow,
  thresholds: { expirationWarningDays: number | null } = { expirationWarningDays: null },
  now: Date = new Date(),
): StockStatus {
  if (row.quantity <= 0) return "out";
  const expiryDays = daysUntil(row.expiration_date, now);
  if (expiryDays !== null) {
    if (expiryDays < 0) return "expired";
    if (expiryDays <= (thresholds.expirationWarningDays ?? 30)) return "expiringSoon";
  }
  if ((row.reorder_point ?? 0) > 0 && row.quantity <= (row.reorder_point ?? 0)) return "low";
  return "ok";
}

/** Days between today (UTC date) and the given YYYY-MM-DD; null if no date. */
export function daysUntil(date: string | null | undefined, now: Date = new Date()): number | null {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00Z`).getTime();
  if (Number.isNaN(target)) return null;
  const utcNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffMs = target - utcNow;
  return Math.floor(diffMs / 86_400_000);
}

/** Sum of quantities — the chrome card's "total units" headline. */
export function totalUnits(rows: ReadonlyArray<FieldStockRow>): number {
  let sum = 0;
  for (const r of rows) sum += r.quantity;
  return Math.round(sum);
}

/**
 * The doctor's current on-hand for a product across all their field inventories. Used by
 * Mo3.3's negative-stock guard at the Mo4 issuance preview — a sale that would push
 * `onHand - requested < 0` is blocked locally before enqueue.
 */
export async function computeFieldOnHand(
  powerSync: { getOptional: <T>(sql: string, params: unknown[]) => Promise<T | undefined | null> },
  productId: string,
): Promise<number> {
  const row = await powerSync.getOptional<{ qty: number | null }>(
    `SELECT COALESCE(SUM(quantity), 0) AS qty FROM stock_items
       WHERE location_type = 'field' AND product_id = ?`,
    [productId],
  );
  return Math.max(0, row?.qty ?? 0);
}

/**
 * A single sale-or-deduct line whose requested quantity needs to be checked against
 * field on-hand. Mo4's field-invoice preview composes the cart into this shape before
 * enqueuing the `POST /visits/{id}/field-invoice` REST intent.
 */
export interface FieldStockLine {
  productId: string;
  /** Display label for the 🔴 prompt — the product's Arabic name. */
  productName: string;
  /** Positive quantity the doctor wants to deduct from the car. */
  requestedQty: number;
}

/** One short on a single product line. `deficit` is always positive. */
export interface FieldStockShortage {
  productId: string;
  productName: string;
  requestedQty: number;
  onHand: number;
  deficit: number;
}

export interface FieldStockGuardResult {
  /** True when every line has enough on-hand. */
  ok: boolean;
  /** Empty when `ok` is true; otherwise one entry per under-stocked product. */
  shortages: FieldStockShortage[];
}

/**
 * Batch-check a set of sale lines against current field on-hand. Mo4's issuance preview
 * runs this just before queueing the REST intent — any shortage triggers the 🔴
 * "negative stock" prompt + a reload-inventory hint, and submission is blocked locally.
 * (The server would also reject the assembled invoice with `negative_stock`; doing it on
 * the device first saves the round-trip and gives the doctor a clearer remediation step.)
 *
 * Lines with the same `productId` collapse: their requested qtys sum before the check,
 * matching the server's per-product accounting.
 */
export async function checkFieldStockAvailability(
  powerSync: { getOptional: <T>(sql: string, params: unknown[]) => Promise<T | undefined | null> },
  lines: ReadonlyArray<FieldStockLine>,
): Promise<FieldStockGuardResult> {
  const byProduct = new Map<string, { name: string; requested: number }>();
  for (const line of lines) {
    if (line.requestedQty <= 0) continue;
    const prior = byProduct.get(line.productId);
    if (prior) {
      prior.requested += line.requestedQty;
    } else {
      byProduct.set(line.productId, {
        name: line.productName,
        requested: line.requestedQty,
      });
    }
  }

  const shortages: FieldStockShortage[] = [];
  for (const [productId, { name, requested }] of byProduct) {
    const onHand = await computeFieldOnHand(powerSync, productId);
    if (requested > onHand) {
      shortages.push({
        productId,
        productName: name,
        requestedQty: requested,
        onHand,
        deficit: Math.round((requested - onHand) * 1000) / 1000,
      });
    }
  }

  return { ok: shortages.length === 0, shortages };
}
