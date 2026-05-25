import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useFieldInventories } from "@/queries/inventory";
import { useAuthStore } from "@/stores/authStore";

const VET_ROLES = ["vet_clinic", "vet_field", "vet_both"];

export interface DoctorOption {
  id: string;
  name: string;
}

/**
 * The doctor list for the appointments picker + calendar filter. Today's only authenticated source
 * for non-admin roles is `GET /inventory/field-inventories` (field doctors); when the signed-in user
 * is a vet they're offered as "me" even without a field inventory (the W3/W4 precedent — the JWT
 * carries no display name). Isolated behind this one hook so a dedicated doctor endpoint can replace
 * the source later with no change to the calling screens.
 */
export function useDoctorOptions(): {
  options: DoctorOption[];
  byId: Map<string, string>;
  isLoading: boolean;
} {
  const { t } = useTranslation();
  const me = useAuthStore((s) => s.user);
  const isVet = !!me && VET_ROLES.includes(me.role);
  const fieldInvs = useFieldInventories();

  return useMemo(() => {
    const options: DoctorOption[] = (fieldInvs.data ?? []).map((f) => ({
      id: f.doctorId,
      name: f.doctorName,
    }));
    if (isVet && me && !options.some((o) => o.id === me.userId)) {
      options.unshift({ id: me.userId, name: t("appointments.me") });
    }
    const byId = new Map(options.map((o) => [o.id, o.name]));
    return { options, byId, isLoading: fieldInvs.isLoading };
  }, [fieldInvs.data, fieldInvs.isLoading, isVet, me, t]);
}
