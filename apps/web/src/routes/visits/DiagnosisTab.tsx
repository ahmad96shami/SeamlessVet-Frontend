import { zodResolver } from "@hookform/resolvers/zod";
import { applyFieldErrors, SEVERITY_VALUES, type ApiError, type VisitResponse } from "@vet/shared";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { AutosaveStatus } from "@/components/form/AutosaveStatus";
import { Field } from "@/components/form/Field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAutosave } from "@/hooks/useAutosave";
import { useUpdateVisit } from "@/queries/visits";

const DiagnosisFormSchema = z.object({
  preliminaryDiagnosis: z.string(),
  finalDiagnosis: z.string(),
  severity: z.enum(["", "mild", "moderate", "severe", "critical"]),
  icdVetCode: z.string(),
});
type DiagnosisForm = z.infer<typeof DiagnosisFormSchema>;

const text = (s: string) => (s.trim() === "" ? undefined : s.trim());

function formFromVisit(v: VisitResponse): DiagnosisForm {
  return {
    preliminaryDiagnosis: v.preliminaryDiagnosis ?? "",
    finalDiagnosis: v.finalDiagnosis ?? "",
    severity: (v.severity ?? "") as DiagnosisForm["severity"],
    icdVetCode: v.icdVetCode ?? "",
  };
}

/** Diagnosis section (PRD §5.2-B) — debounced section-level PATCH autosave. */
export function DiagnosisTab({ visit, readOnly }: { visit: VisitResponse; readOnly: boolean }) {
  const { t } = useTranslation();
  const update = useUpdateVisit();
  const form = useForm<DiagnosisForm>({
    resolver: zodResolver(DiagnosisFormSchema),
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

  const onValid = (vals: DiagnosisForm) => {
    update.mutate(
      {
        id: visit.id,
        body: {
          preliminaryDiagnosis: text(vals.preliminaryDiagnosis),
          finalDiagnosis: text(vals.finalDiagnosis),
          severity: vals.severity || undefined,
          icdVetCode: text(vals.icdVetCode),
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
            label={t("visits.diagnosis.preliminary")}
            error={errors.preliminaryDiagnosis?.message}
          >
            <Textarea rows={2} disabled={readOnly} {...register("preliminaryDiagnosis")} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={t("visits.diagnosis.final")} error={errors.finalDiagnosis?.message}>
            <Textarea rows={2} disabled={readOnly} {...register("finalDiagnosis")} />
          </Field>
        </div>
        <Field label={t("visits.diagnosis.severity")} error={errors.severity?.message}>
          <Select disabled={readOnly} {...register("severity")}>
            <option value="">{t("visits.diagnosis.severityNone")}</option>
            {SEVERITY_VALUES.map((s) => (
              <option key={s} value={s}>
                {t(`severity.${s}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("visits.diagnosis.icdVetCode")} error={errors.icdVetCode?.message}>
          <Input dir="ltr" disabled={readOnly} {...register("icdVetCode")} />
        </Field>
      </div>
      {!readOnly ? <AutosaveStatus pending={update.isPending} error={update.isError} /> : null}
    </form>
  );
}
