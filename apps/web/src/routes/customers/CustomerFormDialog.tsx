import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyFieldErrors,
  CUSTOMER_TYPE_VALUES,
  CustomerRequestSchema,
  type ApiError,
  type CustomerRequest,
  type CustomerResponse,
} from "@vet/shared";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Field } from "@/components/form/Field";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { omitEmptyStrings } from "@/lib/forms";
import { useCreateCustomer, useUpdateCustomer } from "@/queries/customers";
import { useFieldInventories } from "@/queries/inventory";

const DEFAULTS: CustomerRequest = {
  type: "home",
  fullName: "",
  phonePrimary: "",
  phoneSecondary: "",
  address: "",
  email: "",
  idNumber: "",
  notes: "",
  assignedDoctorId: "",
};

export function CustomerFormDialog({
  open,
  customer,
  onClose,
}: {
  open: boolean;
  customer: CustomerResponse | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  // Assignable doctors = field doctors (assigned_doctor_id drives the field-app sync scope); the
  // authenticated field-inventories read is the only doctor source available to non-admin roles.
  const doctors = useFieldInventories();
  const form = useForm<CustomerRequest>({
    resolver: zodResolver(CustomerRequestSchema),
    defaultValues: DEFAULTS,
  });
  const { register, control, handleSubmit, reset, setError, formState } = form;
  const errors = formState.errors;

  useEffect(() => {
    if (!open) return;
    reset(
      customer
        ? {
            type: customer.type as CustomerRequest["type"],
            fullName: customer.fullName,
            phonePrimary: customer.phonePrimary ?? "",
            phoneSecondary: customer.phoneSecondary ?? "",
            address: customer.address ?? "",
            email: customer.email ?? "",
            idNumber: customer.idNumber ?? "",
            notes: customer.notes ?? "",
            assignedDoctorId: customer.assignedDoctorId ?? "",
          }
        : DEFAULTS,
    );
  }, [open, customer, reset]);

  const onSubmit = handleSubmit((values) => {
    const body = omitEmptyStrings(values); // empty optional text → omitted (stored as null)
    const onError = (e: ApiError) =>
      applyFieldErrors(e, (name, err) => setError(name as never, err));
    if (customer) {
      update.mutate(
        { id: customer.id, body },
        {
          onSuccess: () => {
            toast.success(t("admin.common.updated"));
            onClose();
          },
          onError,
        },
      );
    } else {
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
      title={customer ? t("customers.editTitle") : t("customers.newTitle")}
      className="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("customers.type")} error={errors.type?.message}>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)}>
                  {CUSTOMER_TYPE_VALUES.map((ct) => (
                    <option key={ct} value={ct}>
                      {t(`customerType.${ct}`)}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
          <Field label={t("customers.fullName")} error={errors.fullName?.message}>
            <Input autoFocus {...register("fullName")} />
          </Field>
          <Field label={t("customers.phonePrimary")} error={errors.phonePrimary?.message}>
            <Input dir="ltr" {...register("phonePrimary")} />
          </Field>
          <Field label={t("customers.phoneSecondary")} error={errors.phoneSecondary?.message}>
            <Input dir="ltr" {...register("phoneSecondary")} />
          </Field>
          <Field label={t("customers.idNumber")} error={errors.idNumber?.message}>
            <Input dir="ltr" {...register("idNumber")} />
          </Field>
          <Field label={t("customers.email")} error={errors.email?.message}>
            <Input dir="ltr" {...register("email")} />
          </Field>
          <Field label={t("customers.assignedDoctor")} error={errors.assignedDoctorId?.message}>
            <Controller
              name="assignedDoctorId"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)}>
                  <option value="">{t("customers.noDoctor")}</option>
                  {(doctors.data ?? []).map((d) => (
                    <option key={d.doctorId} value={d.doctorId}>
                      {d.doctorName}
                    </option>
                  ))}
                </Select>
              )}
            />
          </Field>
        </div>
        <Field label={t("customers.address")} error={errors.address?.message}>
          <Textarea rows={2} {...register("address")} />
        </Field>
        <Field label={t("customers.notes")} error={errors.notes?.message}>
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
