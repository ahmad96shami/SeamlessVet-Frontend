import { View, type ViewProps } from "react-native";

import { Icon3D, type Icon3DName } from "../icons/Icon3D";

/**
 * The design's client "photo" — a 3D-clay avatar standing in for a real picture
 * on customer / farm rows (visits list, client picker, statement header…).
 *
 * Use the mapping helpers below so every screen resolves the same scene for the
 * same `customers.type` / `farms.kind` value.
 */
interface PhotoProps extends ViewProps {
  kind: Icon3DName;
  size?: number;
}

export function Photo({ kind, size = 56, className, style, ...rest }: PhotoProps) {
  return (
    <View
      className={`items-center justify-center overflow-hidden ${className ?? ""}`}
      style={[{ width: size, height: size }, style]}
      {...rest}
    >
      <Icon3D name={kind} size={size} />
    </View>
  );
}

/** `customers.type` → avatar scene (CustomerType enum in @vet/shared). */
export function photoKindForCustomerType(type: string | null | undefined): Icon3DName {
  switch (type) {
    case "poultry_farm":
      return "chicken";
    case "cattle_farm":
      return "cow";
    case "home":
    case "clinic_customer":
      return "house";
    default:
      return "farm"; // regular_farm + anything unknown
  }
}

/** `farms.kind` → avatar scene (FarmKind enum in @vet/shared). */
export function photoKindForFarmKind(kind: string | null | undefined): Icon3DName {
  switch (kind) {
    case "poultry":
      return "chicken";
    case "cattle":
      return "cow";
    default:
      return "farm"; // mixed / other
  }
}
