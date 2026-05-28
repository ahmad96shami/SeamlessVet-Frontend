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

export interface VisitRow {
  id: string;
  visit_type: string;
  visit_number: string | null;
  customer_id: string;
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
