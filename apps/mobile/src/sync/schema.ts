import { column, Schema, Table } from "@powersync/react-native";

/**
 * The on-device SQLite mirror of every server table this doctor's PowerSync bucket
 * streams in. PowerSync stores rows in its own internal table and projects each
 * declaration here as a SQLite *view* with the matching name; the columns listed
 * are the ones the field-doctor UI reads or writes.
 *
 * Column-type rules (SCHEMA.md):
 * - GUIDs, dates, timestamps, enums, free text  → TEXT
 * - decimals (quantity, price, percent, balance) → REAL (JS Number — the mobile UI
 *   formats; money is server-authoritative via `/sync/*` so 2-dp precision loss
 *   would only ever affect display, never the ledger)
 * - integers (counts, durations)                 → INTEGER
 * - booleans                                     → INTEGER (0/1)
 *
 * `id` is implicit (PowerSync adds it). Snake_case mirrors the server column names
 * so a `/sync/{table}` payload round-trips verbatim.
 */
export const AppSchema = new Schema({
  // -- §2 Customers & Pets ---------------------------------------------------
  customers: new Table({
    type: column.text,
    full_name: column.text,
    phone_primary: column.text,
    phone_secondary: column.text,
    address: column.text,
    email: column.text,
    id_number: column.text,
    notes: column.text,
    assigned_doctor_id: column.text,
    created_at: column.text,
    updated_at: column.text,
  }),

  pets: new Table(
    {
      customer_id: column.text,
      farm_id: column.text,
      name: column.text,
      species: column.text,
      breed: column.text,
      sex: column.text,
      date_of_birth: column.text,
      color_marks: column.text,
      weight_latest: column.real,
      photo_url: column.text,
      microchip_no: column.text,
      health_notes: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { ix_pets_customer: ["customer_id"] } },
  ),

  // M15 — a customer owns 1–N farms (attached like pets; inherits the customer's doctor scope).
  farms: new Table(
    {
      customer_id: column.text,
      name: column.text,
      kind: column.text,
      location: column.text,
      animal_type: column.text,
      head_count: column.integer,
      notes: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { ix_farms_customer: ["customer_id"] } },
  ),

  // M16 — polymorphic owner: exactly one of customer_id / farm_id is set (ck_ledgers_owner).
  // A customer's own ledger keys on customer_id; each farm carries its own ledger keyed on
  // farm_id (streamed via the my_farms sync rule), powering Mo8's offline per-farm balances.
  ledgers: new Table(
    {
      customer_id: column.text,
      farm_id: column.text,
      balance: column.real,
      status: column.text,
      closed_at: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { ix_ledgers_farm: ["farm_id"] } },
  ),

  ledger_entries: new Table(
    {
      ledger_id: column.text,
      entry_type: column.text,
      amount: column.real,
      balance_after: column.real,
      invoice_id: column.text,
      receipt_voucher_id: column.text,
      description: column.text,
      idempotency_key: column.text,
      created_at: column.text,
    },
    { indexes: { ix_ledger_entries_ledger: ["ledger_id"] } },
  ),

  // -- §3 Catalog (reference data — pull-only on clients) -------------------
  products: new Table({
    name_ar: column.text,
    name_latin: column.text,
    barcode: column.text,
    category: column.text,
    manufacturer: column.text,
    supplier: column.text,
    purchase_price: column.real,
    selling_price: column.real,
    unit_of_measure: column.text,
    expiration_date: column.text,
    reorder_point: column.real,
    updated_at: column.text,
  }),

  services: new Table({
    name_ar: column.text,
    name_latin: column.text,
    category: column.text,
    default_price: column.real,
    updated_at: column.text,
  }),

  // -- §4 Inventory ----------------------------------------------------------
  stock_items: new Table(
    {
      location_type: column.text,
      location_id: column.text,
      product_id: column.text,
      quantity: column.real,
      updated_at: column.text,
    },
    { indexes: { ix_stock_items_product: ["product_id"] } },
  ),

  inventory_movements: new Table(
    {
      product_id: column.text,
      movement_type: column.text,
      from_location_type: column.text,
      from_location_id: column.text,
      to_location_type: column.text,
      to_location_id: column.text,
      quantity_delta: column.real,
      reason: column.text,
      visit_id: column.text,
      invoice_id: column.text,
      performed_by: column.text,
      idempotency_key: column.text,
      created_at: column.text,
    },
    { indexes: { ix_inv_moves_product_time: ["product_id", "created_at"] } },
  ),

  // -- §5 Contracts & Batches ------------------------------------------------
  contracts: new Table(
    {
      customer_id: column.text,
      responsible_doctor_id: column.text,
      period_start: column.text,
      period_end: column.text,
      total_price: column.real,
      expected_visit_count: column.integer,
      animal_type: column.text,
      animal_count: column.integer,
      status: column.text,
      created_by: column.text,
      activated_by: column.text,
      activated_at: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { ix_contracts_customer: ["customer_id"] } },
  ),

  contract_medication_prices: new Table(
    {
      contract_id: column.text,
      product_id: column.text,
      contract_price: column.real,
      updated_at: column.text,
    },
    { indexes: { ix_cmp_contract: ["contract_id"] } },
  ),

  // M15 — which farms (of the contract's customer) a contract covers.
  contract_farms: new Table(
    {
      contract_id: column.text,
      farm_id: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { ix_contract_farms_contract: ["contract_id"] } },
  ),

  batches: new Table(
    {
      contract_id: column.text,
      customer_id: column.text,
      farm_id: column.text,
      responsible_doctor_id: column.text,
      animal_count: column.integer,
      start_date: column.text,
      end_date: column.text,
      supervision_fee_model: column.text,
      supervision_fee_value: column.real,
      // M28 — the supervision fee IS the doctor's entitlement (no percent/ceiling); the device
      // reads entitlement_enabled/_system for the read-only batch view. The dropped server columns
      // doctor_share_percent/doctor_share_ceiling are gone from the AppSchema too.
      entitlement_enabled: column.integer,
      entitlement_system: column.text,
      status: column.text,
      created_at: column.text,
      updated_at: column.text,
    },
    { indexes: { ix_batches_customer: ["customer_id"] } },
  ),

  // -- §6 Visits & Medical ---------------------------------------------------
  visits: new Table(
    {
      visit_type: column.text,
      visit_number: column.text,
      customer_id: column.text,
      farm_id: column.text,
      pet_id: column.text,
      batch_id: column.text,
      contract_id: column.text,
      doctor_id: column.text,
      receptionist_id: column.text,
      status: column.text,
      started_at: column.text,
      ended_at: column.text,
      chief_complaint: column.text,
      symptoms: column.text,
      temperature: column.real,
      heart_rate: column.integer,
      respiratory_rate: column.integer,
      weight: column.real,
      clinical_notes: column.text,
      preliminary_diagnosis: column.text,
      final_diagnosis: column.text,
      severity: column.text,
      icd_vet_code: column.text,
      exam_fee_applied: column.real,
      created_at: column.text,
      updated_at: column.text,
    },
    {
      indexes: {
        ix_visits_customer_time: ["customer_id", "started_at"],
        ix_visits_batch: ["batch_id"],
        ix_visits_contract: ["contract_id"],
      },
    },
  ),

  procedures: new Table(
    {
      visit_id: column.text,
      service_id: column.text,
      result_text: column.text,
      result_file_url: column.text,
      price: column.real,
      created_at: column.text,
    },
    { indexes: { ix_procedures_visit: ["visit_id"] } },
  ),

  prescriptions: new Table(
    {
      visit_id: column.text,
      product_id: column.text,
      dosage: column.text,
      frequency: column.text,
      duration: column.text,
      notes: column.text,
      dispense_type: column.text,
      quantity: column.real,
      // M18 — recurring-dose reminder schedule (reminder_enabled is 0/1; timestamps ISO text;
      // last_reminded_dose is server-managed — streamed for display, never written locally).
      reminder_enabled: column.integer,
      interval_minutes: column.integer,
      lead_minutes: column.integer,
      start_at: column.text,
      end_at: column.text,
      doses_count: column.integer,
      last_reminded_dose: column.integer,
      created_at: column.text,
    },
    { indexes: { ix_prescriptions_visit: ["visit_id"] } },
  ),

  vaccinations: new Table(
    {
      pet_id: column.text,
      customer_id: column.text,
      visit_id: column.text,
      // M26 — vaccines are stock products: product_id links a catalog product (category 'vaccine'),
      // price snapshots the charge, resolved_unit_cost is the server-captured FEFO lot cost (read-only —
      // the /sync path never deducts, so it stays null on device-administered doses). vaccine_type is
      // the product-name snapshot (or free text for legacy/next-dose-reminder rows with product_id null).
      product_id: column.text,
      vaccine_type: column.text,
      price: column.real,
      resolved_unit_cost: column.real,
      date_given: column.text,
      next_due_date: column.text,
      certificate_url: column.text,
      created_at: column.text,
    },
    { indexes: { ix_vaccinations_due: ["next_due_date"] } },
  ),

  attachments: new Table(
    {
      visit_id: column.text,
      file_type: column.text,
      url: column.text,
      title: column.text,
      doc_date: column.text,
      description: column.text,
      upload_status: column.text,
      created_at: column.text,
    },
    { indexes: { ix_attachments_visit: ["visit_id"] } },
  ),

  // -- §8 Financial ----------------------------------------------------------
  invoices: new Table(
    {
      invoice_type: column.text,
      customer_id: column.text,
      farm_id: column.text,
      visit_id: column.text,
      batch_id: column.text,
      number: column.text,
      subtotal: column.real,
      discount_amount: column.real,
      tax_amount: column.real,
      total: column.real,
      status: column.text,
      issued_by: column.text,
      issued_at: column.text,
      idempotency_key: column.text,
      created_at: column.text,
    },
    { indexes: { ix_invoices_customer: ["customer_id", "issued_at"] } },
  ),

  invoice_items: new Table(
    {
      invoice_id: column.text,
      product_id: column.text,
      service_id: column.text,
      description: column.text,
      quantity: column.real,
      unit_price: column.real,
      cost_price: column.real,
      discount_amount: column.real,
      line_total: column.real,
    },
    { indexes: { ix_invoice_items_invoice: ["invoice_id"] } },
  ),

  payments: new Table(
    {
      invoice_id: column.text,
      method: column.text,
      amount: column.real,
      paid_at: column.text,
    },
    { indexes: { ix_payments_invoice: ["invoice_id"] } },
  ),

  receipt_vouchers: new Table(
    {
      customer_id: column.text,
      amount: column.real,
      method: column.text,
      issued_by: column.text,
      issued_at: column.text,
      notes: column.text,
      idempotency_key: column.text,
      created_at: column.text,
    },
    { indexes: { ix_vouchers_customer: ["customer_id", "issued_at"] } },
  ),

  // -- §9 System -------------------------------------------------------------
  system_settings: new Table({
    default_exam_fee: column.real,
    entitlement_enabled_global: column.integer,
    low_stock_threshold_pct: column.real,
    expiration_warning_days: column.integer,
    tax_enabled: column.integer,
    tax_rate: column.real,
    logo_url: column.text,
    updated_at: column.text,
  }),
});

export type AppSchema = typeof AppSchema;
