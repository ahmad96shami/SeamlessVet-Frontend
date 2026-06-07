import type { VisitResponse } from "@vet/shared";
import { useMemo } from "react";

import { useAttachments } from "@/queries/attachments";
import { useDailyFollowUps } from "@/queries/dailyFollowUps";
import { useNightStays } from "@/queries/nightStays";
import { usePrescriptions } from "@/queries/prescriptions";
import { useProcedures } from "@/queries/procedures";
import { useVaccinations } from "@/queries/vaccinations";

/**
 * Per-tab content indicators for the visit page: a COUNT for the record tabs (procedures,
 * prescriptions, vaccinations, night stays, daily follow-ups, files) and a has-content BOOLEAN for
 * the form tabs (assessment, diagnosis — they're one record, not a list). The queries reuse the
 * exact keys each tab fetches with, so opening a tab costs nothing extra. Clinic-only data
 * (night stays / daily follow-ups) is skipped for field visits.
 */
export function useVisitTabBadges(visit: VisitResponse | null | undefined) {
  const isClinic = visit?.visitType === "in_clinic";
  const visitId = visit?.id ?? null;
  const procedures = useProcedures(visitId);
  const prescriptions = usePrescriptions(visitId);
  const vaccinations = useVaccinations({ visitId: visitId ?? undefined, take: 200 }, visitId !== null);
  const nightStays = useNightStays(isClinic ? visitId : null);
  const followUps = useDailyFollowUps(isClinic ? visitId : null);
  const attachments = useAttachments(visitId);

  return useMemo(() => {
    const count = (n: number | undefined) => (n && n > 0 ? n : undefined);
    const assessment =
      Boolean(visit?.chiefComplaint?.trim()) ||
      Boolean(visit?.symptoms?.trim()) ||
      visit?.temperature != null ||
      visit?.heartRate != null ||
      visit?.respiratoryRate != null ||
      visit?.weight != null ||
      Boolean(visit?.clinicalNotes?.trim());
    const diagnosis =
      Boolean(visit?.preliminaryDiagnosis?.trim()) ||
      Boolean(visit?.finalDiagnosis?.trim()) ||
      Boolean(visit?.severity) ||
      Boolean(visit?.icdVetCode?.trim());

    return {
      assessment: assessment || undefined,
      diagnosis: diagnosis || undefined,
      procedures: count(procedures.data?.length),
      prescriptions: count(prescriptions.data?.length),
      vaccinations: count(vaccinations.data?.length),
      nightStays: count(nightStays.data?.length),
      followups: count(followUps.data?.length),
      files: count(attachments.data?.length),
    } as const;
  }, [
    visit,
    procedures.data, prescriptions.data, vaccinations.data, nightStays.data,
    followUps.data, attachments.data,
  ]);
}
