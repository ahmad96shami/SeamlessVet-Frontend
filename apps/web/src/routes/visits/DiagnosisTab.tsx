import { zodResolver } from "@hookform/resolvers/zod";
import { applyFieldErrors, SEVERITY_VALUES, type ApiError, type VisitResponse } from "@vet/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

/** Diagnosis section (PRD §5.2-B) — section-level PATCH save. */
export function DiagnosisTab({ visit, readOnly }: { visit: VisitResponse; readOnly: boolean }) {
  const { t } = useTranslation();
  const update = useUpdateVisit();
  const form = useForm<DiagnosisForm>({
    resolver: zodResolver(DiagnosisFormSchema),
    defaultValues: formFromVisit(visit),
  });
  const { register, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    reset(formFromVisit(visit));
  }, [visit, reset]);

  const onSubmit = handleSubmit((vals) => {
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
      {
        onSuccess: () => toast.success(t("visits.diagnosis.saved")),
        onError: (e: ApiError) => applyFieldErrors(e, (n, err) => setError(n as never, err)),
      },
    );
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={t("visits.diagnosis.preliminary")} error={errors.preliminaryDiagnosis?.message}>
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
      {!readOnly ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? t("admin.common.saving") : t("visits.diagnosis.save")}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
