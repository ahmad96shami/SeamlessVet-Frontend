/**
 * Row types projected from on-device SQLite via PowerSync's `useQuery`. Fields are snake_case
 * because the AppSchema (sync/schema.ts) mirrors the server's column names verbatim — that's
 * what lets a `/sync/{table}` upload round-trip without per-screen mapping. Nullables match the
 * server's nullable columns; numeric columns ride PowerSync's REAL/INTEGER mapping.
 */
export interface CustomerRow {
  id: string;
  type: string;
  full_name: string;
  phone_primary: string | null;
  phone_secondary: string | null;
  address: string | null;
  email: string | null;
  id_number: string | null;
  notes: string | null;
  assigned_doctor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PetRow {
  id: string;
  customer_id: string;
  farm_id: string | null;
  name: string;
  species: string | null;
  breed: string | null;
  sex: string | null;
  date_of_birth: string | null;
  color_marks: string | null;
  weight_latest: number | null;
  photo_url: string | null;
  microchip_no: string | null;
  health_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** M15 — a farm/site owned by a customer, attached the way pets are (shared FarmResponse mirror). */
export interface FarmRow {
  id: string;
  customer_id: string;
  name: string;
  kind: string;
  location: string | null;
  animal_type: string | null;
  head_count: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** M15 — which farms (of the contract's customer) a contract covers (shared ContractFarm mirror). */
export interface ContractFarmRow {
  id: string;
  contract_id: string;
  farm_id: string;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * M16 — polymorphic owner: exactly one of `customer_id` / `farm_id` is set (ck_ledgers_owner).
 * Positive `balance` = the owner owes the clinic.
 */
export interface LedgerRow {
  id: string;
  customer_id: string | null;
  farm_id: string | null;
  balance: number;
  status: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntryRow {
  id: string;
  ledger_id: string;
  entry_type: string;
  amount: number;
  balance_after: number;
  invoice_id: string | null;
  receipt_voucher_id: string | null;
  description: string | null;
  created_at: string;
}

export interface ProcedureRow {
  id: string;
  visit_id: string;
  service_id: string | null;
  result_text: string | null;
  result_file_url: string | null;
  price: number;
  created_at: string;
}

export interface PrescriptionRow {
  id: string;
  visit_id: string;
  product_id: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  notes: string | null;
  dispense_type: string;
  quantity: number | null;
  // M18 — recurring-dose reminder schedule (SQLite has no bool: 0/1).
  reminder_enabled: number | null;
  interval_minutes: number | null;
  lead_minutes: number | null;
  start_at: string | null;
  end_at: string | null;
  doses_count: number | null;
  last_reminded_dose: number | null;
  created_at: string;
}

export interface VaccinationRow {
  id: string;
  pet_id: string | null;
  customer_id: string | null;
  visit_id: string | null;
  // M26 — catalog vaccine product (category 'vaccine'); null for legacy free-text + next-dose reminders.
  product_id: string | null;
  vaccine_type: string;
  price: number | null;
  /** Server-captured FEFO lot cost; read-only (null on device-administered rows — /sync never deducts). */
  resolved_unit_cost: number | null;
  date_given: string;
  next_due_date: string | null;
  certificate_url: string | null;
  created_at: string;
}

export interface ServiceRow {
  id: string;
  name_ar: string;
  name_latin: string | null;
  category: string | null;
  default_price: number | null;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  name_ar: string;
  name_latin: string | null;
  barcode: string | null;
  category: string | null;
  selling_price: number | null;
  unit_of_measure: string | null;
  updated_at: string;
}

export interface VisitRow {
  id: string;
  visit_type: string;
  visit_number: string | null;
  customer_id: string;
  farm_id: string | null;
  pet_id: string | null;
  batch_id: string | null;
  contract_id: string | null;
  doctor_id: string;
  receptionist_id: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  chief_complaint: string | null;
  symptoms: string | null;
  temperature: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  weight: number | null;
  clinical_notes: string | null;
  preliminary_diagnosis: string | null;
  final_diagnosis: string | null;
  severity: string | null;
  icd_vet_code: string | null;
  exam_fee_applied: number | null;
  created_at: string;
  updated_at: string;
}

export interface AttachmentRow {
  id: string;
  visit_id: string;
  file_type: string;
  /** Synced-down value (object key / null) — viewing always fetches a fresh signed URL via the API. */
  url: string | null;
  title: string | null;
  doc_date: string | null;
  description: string | null;
  upload_status: string;
  created_at: string;
}

export interface ContractRow {
  id: string;
  customer_id: string;
  responsible_doctor_id: string | null;
  period_start: string;
  period_end: string | null;
  total_price: number | null;
  expected_visit_count: number | null;
  animal_type: string | null;
  animal_count: number | null;
  status: string;
  created_by: string | null;
  activated_by: string | null;
  activated_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ContractMedicationPriceRow {
  id: string;
  contract_id: string;
  product_id: string;
  contract_price: number;
  updated_at: string | null;
}

export interface BatchRow {
  id: string;
  contract_id: string | null;
  customer_id: string;
  responsible_doctor_id: string;
  animal_count: number;
  start_date: string;
  end_date: string | null;
  supervision_fee_model: string;
  supervision_fee_value: number;
  /** SQLite INTEGER 0/1; tri-state — `null` inherits the global entitlement setting (SCHEMA #4). */
  entitlement_enabled: number | null;
  entitlement_system: string | null;
  // M28 — doctor_share_percent/doctor_share_ceiling removed: the supervision fee IS the entitlement.
  status: string;
  created_at: string | null;
  updated_at: string | null;
}
