import { zodResolver } from "@hookform/resolvers/zod";
import { applyFieldErrors, type ApiError, type VisitResponse } from "@vet/shared";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { AutosaveStatus } from "@/components/form/AutosaveStatus";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAutosave } from "@/hooks/useAutosave";
import { useUpdateVisit } from "@/queries/visits";

// Local form schema (≠ the wire patch): vitals are strings from number inputs (empty stays "",
// not NaN) parsed at submit. Empty fields are sent as undefined → omitted → left unchanged.
const numberish = z
  .string()
  .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0), { message: "invalid" });

const AssessmentFormSchema = z.object({
  chiefComplaint: z.string(),
  symptoms: z.string(),
  temperature: numberish,
  heartRate: numberish,
  respiratoryRate: numberish,
  weight: numberish,
  clinicalNotes: z.string(),
});
type AssessmentForm = z.infer<typeof AssessmentFormSchema>;

const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
const text = (s: string) => (s.trim() === "" ? undefined : s.trim());

function formFromVisit(v: VisitResponse): AssessmentForm {
  return {
    chiefComplaint: v.chiefComplaint ?? "",
    symptoms: v.symptoms ?? "",
    temperature: v.temperature != null ? String(v.temperature) : "",
    heartRate: v.heartRate != null ? String(v.heartRate) : "",
    respiratoryRate: v.respiratoryRate != null ? String(v.respiratoryRate) : "",
    weight: v.weight != null ? String(v.weight) : "",
    clinicalNotes: v.clinicalNotes ?? "",
  };
}

/** Initial-assessment section (PRD §5.2-A) — debounced section-level PATCH autosave. */
export function AssessmentTab({ visit, readOnly }: { visit: VisitResponse; readOnly: boolean }) {
  const { t } = useTranslation();
  const update = useUpdateVisit();
  const form = useForm<AssessmentForm>({
    resolver: zodResolver(AssessmentFormSchema),
    defaultValues: formFromVisit(visit),
    shouldFocusError: false, // autosave validates silently — never yank focus mid-typing
  });
  const { register, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  // Re-sync from the server. On a different visit → full reset; on a same-visit refetch (our own
  // autosave invalidates the visit) → keep the fields the user is still editing so a slow round trip
  // never clobbers in-flight keystrokes.
  const lastIdRef = useRef(visit.id);
  useEffect(() => {
    const idChanged = lastIdRef.current !== visit.id;
    lastIdRef.current = visit.id;
    reset(formFromVisit(visit), idChanged ? undefined : { keepDirtyValues: true });
  }, [visit, reset]);

  const onValid = (vals: AssessmentForm) => {
    update.mutate(
      {
        id: visit.id,
        body: {
          chiefComplaint: text(vals.chiefComplaint),
          symptoms: text(vals.symptoms),
          temperature: num(vals.temperature),
          heartRate: num(vals.heartRate),
          respiratoryRate: num(vals.respiratoryRate),
          weight: num(vals.weight),
          clinicalNotes: text(vals.clinicalNotes),
        },
      },
      { onError: (e: ApiError) => applyFieldErrors(e, (n, err) => setError(n as never, err)) },
    );
  };

  useAutosave(form, onValid, { enabled: !readOnly });

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field
            label={t("visits.assessment.chiefComplaint")}
            error={errors.chiefComplaint?.message}
          >
            <Textarea rows={2} disabled={readOnly} {...register("chiefComplaint")} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={t("visits.assessment.symptoms")} error={errors.symptoms?.message}>
            <Textarea rows={2} disabled={readOnly} {...register("symptoms")} />
          </Field>
        </div>
        <Field label={t("visits.assessment.temperature")} error={errors.temperature?.message}>
          <Input
            type="number"
            step="0.1"
            min="0"
            dir="ltr"
            disabled={readOnly}
            {...register("temperature")}
          />
        </Field>
        <Field label={t("visits.assessment.weight")} error={errors.weight?.message}>
          <Input
            type="number"
            step="0.001"
            min="0"
            dir="ltr"
            disabled={readOnly}
            {...register("weight")}
          />
        </Field>
        <Field label={t("visits.assessment.heartRate")} error={errors.heartRate?.message}>
          <Input
            type="number"
            step="1"
            min="0"
            dir="ltr"
            disabled={readOnly}
            {...register("heartRate")}
          />
        </Field>
        <Field
          label={t("visits.assessment.respiratoryRate")}
          error={errors.respiratoryRate?.message}
        >
          <Input
            type="number"
            step="1"
            min="0"
            dir="ltr"
            disabled={readOnly}
            {...register("respiratoryRate")}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t("visits.assessment.clinicalNotes")} error={errors.clinicalNotes?.message}>
            <Textarea rows={3} disabled={readOnly} {...register("clinicalNotes")} />
          </Field>
        </div>
      </div>
      {!readOnly ? <AutosaveStatus pending={update.isPending} error={update.isError} /> : null}
    </form>
  );
}
