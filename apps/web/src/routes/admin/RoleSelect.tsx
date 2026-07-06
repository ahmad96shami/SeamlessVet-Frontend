import { useTranslation } from "react-i18next";

import { Select } from "@/components/ui/select";
import { useRoles } from "@/queries/roles";

/**
 * Role picker populated from GET /admin/roles, so admin-created custom roles are assignable too.
 * Built-in roles show their localized name (`roles.<key>`); custom roles show their stored name.
 */
export function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const roles = useRoles();

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      <option value="" disabled>
        {t("admin.users.formRole")}
      </option>
      {(roles.data ?? []).map((r) => (
        <option key={r.id} value={r.key}>
          {r.isBuiltIn ? t(`roles.${r.key}`, { defaultValue: r.name }) : r.name}
        </option>
      ))}
    </Select>
  );
}
