import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import {
  applyFieldErrors,
  listUsers,
  type ApiError,
  type EmployeeCreateRequest,
  type EmployeePatchRequest,
  type EmployeeResponse,
} from "@vet/shared";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/datepicker";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "@/stores/authStore";
import { useCreateEmployee, useUpdateEmployee } from "@/queries/employees";

// fullName + terms are always editable; the optional user link is fixed at creation (re-linking would
// orphan the ledger). The picker is admin-only — listing users needs `users.manage`, which accountants
// who manage employees don't hold; for them the link is simply omitted (an employee may have none).
const FormSchema = z.object({
  fullName: z.string().trim().min(1),
  userId: z.string().optional(),
  jobTitle: z.string().trim().optional(),
  monthlySalary: z.number().min(0),
  hiredAt: z.string().optional(),
  active: z.boolean(),
  notes: z.string().trim().optional(),
});
type FormValues = z.infer<typeof FormSchema>;

const DEFAULTS: FormValues = {
  fullName: "",
  userId: "",
  jobTitle: "",
  monthlySalary: 0,
  hiredAt: "",
  active: true,
  notes: "",
};

export function EmployeeFormDialog({
  open,
  employee,
  onClose,
}: {
  open: boolean;
  employee: EmployeeResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isAdmin = useAuthStore((s) => s.user?.role) === "admin";
  // Only admins can resolve the staff roster (GET /admin/users needs `users.manage`, which accountants
  // who manage employees don't hold) — so the query is gated to admins; the user link is optional anyway.
  const users = useQuery({
    queryKey: ["users", { status: "active" }],
    queryFn: () => listUsers(apiClient, { status: "active" }),
    enabled: isAdmin,
    staleTime: 5 * 60_000,
  });
  const userOptions = users.data ?? [];

  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: DEFAULTS });
  const { register, control, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      employee
        ? {
            fullName: employee.fullName,
            userId: employee.userId ?? "",
            jobTitle: employee.jobTitle ?? "",
            monthlySalary: employee.monthlySalary,
            hiredAt: employee.hiredAt ?? "",
            active: employee.active,
            notes: employee.notes ?? "",
          }
        : DEFAULTS,
    );
  }, [open, employee, reset]);

  // The linked account's name for the read-only edit display (resolved from the roster when available).
  const linkedName = useMemo(() => {
    if (!employee?.userId) return null;
    return userOptions.find((u) => u.id === employee.userId)?.fullName ?? null;
  }, [employee, userOptions]);

  const onError = (e: ApiError) => {
    if (e.fieldErrors) applyFieldErrors(e, (name, err) => setError(name as never, err));
    else toast.error(e.code === "employee_user_taken" ? t("employees.userTaken") : e.message);
  };

  const onSubmit = handleSubmit((values) => {
    const trimOrUndef = (s?: string) => (s && s.trim() ? s.trim() : undefined);
    if (employee) {
      const body: EmployeePatchRequest = {
        fullName: values.fullName.trim(),
        jobTitle: trimOrUndef(values.jobTitle),
        monthlySalary: values.monthlySalary,
        active: values.active,
        hiredAt: values.hiredAt || undefined,
        notes: trimOrUndef(values.notes),
      };
      update.mutate(
        { id: employee.id, body },
        {
          onSuccess: () => {
            toast.success(t("admin.common.updated"));
            onClose();
          },
          onError,
        },
      );
    } else {
      const body: EmployeeCreateRequest = {
        fullName: values.fullName.trim(),
        userId: values.userId ? values.userId : undefined,
        jobTitle: trimOrUndef(values.jobTitle),
        monthlySalary: values.monthlySalary,
        active: values.active,
        hiredAt: values.hiredAt || undefined,
        notes: trimOrUndef(values.notes),
      };
      create.mutate(body, {
        onSuccess: () => {
          toast.success(t("admin.common.created"));
          onClose();
        },
        onError,
      });
    }
  });

  const pending = create.isPending || update.isPending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={employee ? t("employees.editTitle") : t("employees.newTitle")}
      className="max-w-lg"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("employees.name")} error={errors.fullName?.message}>
            <Input
              autoFocus
              placeholder={t("employees.namePlaceholder")}
              {...register("fullName")}
            />
          </Field>
          <Field label={t("employees.jobTitle")} error={errors.jobTitle?.message}>
            <Input {...register("jobTitle")} />
          </Field>
          <Field label={t("employees.monthlySalary")} error={errors.monthlySalary?.message}>
            <Input
              type="number"
              step="0.01"
              min="0"
              dir="ltr"
              {...register("monthlySalary", { valueAsNumber: true })}
            />
          </Field>
          <Field label={t("employees.hiredAt")} error={errors.hiredAt?.message}>
            <Controller
              control={control}
              name="hiredAt"
              render={({ field }) => (
                <DatePicker
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
            />
          </Field>
        </div>

        {/* Optional user link — fixed after creation; only admins (with users.manage) can pick one. */}
        {employee ? (
          employee.userId ? (
            <Field label={t("employees.user")}>
              <Input value={linkedName ?? t("employees.user")} disabled readOnly />
            </Field>
          ) : null
        ) : isAdmin ? (
          <Field label={t("employees.user")} error={errors.userId?.message}>
            <Controller
              name="userId"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)}>
                  <option value="">{t("employees.userPlaceholder")}</option>
                  {userOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} — {u.roleName}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
        ) : null}

        <Field label={t("employees.active")}>
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  aria-label={t("employees.active")}
                />
                <span className="text-xs text-muted-foreground">
                  {field.value ? t("employees.activeYes") : t("employees.activeNo")}
                </span>
              </div>
            )}
          />
        </Field>

        <Field label={t("employees.notes")} error={errors.notes?.message}>
          <Textarea rows={2} {...register("notes")} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {t("admin.common.cancel")}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t("admin.common.saving") : t("admin.common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
