import { v7 as uuidv7 } from "uuid";

import { powerSync } from "./database";

/**
 * Record a vaccination, administering it from the doctor's field stock when it links a catalog
 * vaccine — Mo11 (M26 vaccines-as-products).
 *
 * A product-linked vaccine is **administered on create**: the server's REST `AdministerAsync`
 * deducts a single dose FEFO and snapshots the lot cost, but the offline `/sync/vaccinations` write
 * path deliberately performs **no** deduction (re-deducting there would double-count). So the field
 * device sends the deduction itself as a separate `inventory_movements` delta (mirrors the Mo3.2
 * returns flow + `PrescriptionsSyncHandler`): one `sale_deduct` of qty 1 from the doctor's field
 * inventory, keyed `vax-{vaccinationId}` exactly like the server's own movement so a retried upload
 * dedupes via `UNIQUE (environment_id, idempotency_key)` and never double-deducts. The server
 * resolves the FEFO lot + cost; the issuance assembler then bills the vaccination as a product line
 * and **skips** re-deducting it (it's already moved), so stock leaves the car exactly once.
 *
 * Both rows go in one `powerSync.writeTransaction` → one CRUD upload group, so a mid-write crash
 * leaves neither queued. Returns the new vaccination id.
 *
 * `productId === null` is the records-only path (legacy free-text / a next-dose reminder): the
 * vaccination row is written with no deduction.
 */
export interface AdministerVaccinationInput {
  visitId: string | null;
  customerId: string | null;
  petId: string | null;
  /** Catalog vaccine product (category 'vaccine'); null = records-only, no stock movement. */
  productId: string | null;
  /** Snapshot of the vaccine name (the picked product's name, or free text for a records-only row). */
  vaccineType: string;
  /** Charge snapshot (the product's selling price); null for records-only rows. */
  price: number | null;
  /** The doctor's field-inventory location to deduct the dose from; required when `productId` is set. */
  fieldLocationId: string | null;
  dateGiven: string;
  nextDueDate: string | null;
  certificateUrl: string | null;
}

export async function administerVaccination(input: AdministerVaccinationInput): Promise<string> {
  const id = uuidv7();
  const now = new Date().toISOString();
  const deduct = input.productId !== null && input.fieldLocationId !== null;

  await powerSync.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO vaccinations
         (id, visit_id, customer_id, pet_id, product_id, vaccine_type, price,
          date_given, next_due_date, certificate_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.visitId,
        input.customerId,
        input.petId,
        input.productId,
        input.vaccineType,
        input.price,
        input.dateGiven,
        input.nextDueDate,
        input.certificateUrl,
      ],
    );

    if (deduct) {
      await tx.execute(
        `INSERT INTO inventory_movements
           (id, product_id, movement_type, from_location_type, from_location_id,
            quantity_delta, reason, visit_id, idempotency_key, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv7(),
          input.productId,
          "sale_deduct",
          "field",
          input.fieldLocationId,
          1, // a vaccination administers a single dose; the server forces the deduct direction
          "vaccination administered",
          input.visitId,
          `vax-${id}`,
          now,
        ],
      );
    }
  });

  return id;
}
