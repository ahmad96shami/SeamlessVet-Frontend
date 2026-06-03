import type { CustomerResponse, PetResponse, VaccinationResponse } from "@vet/shared";

/** id → entity maps for resolving a vaccination's recipient to a display name (the W2/W4 precedent). */
export interface RecipientMaps {
  customerById: Map<string, CustomerResponse>;
  petById: Map<string, PetResponse>;
}

export interface RecipientLabel {
  /** Primary name: the pet's name, or the customer's name for a farm-group vaccination. */
  name: string | null;
  /** Owner name when the recipient is a pet (resolved via the pet's customer). */
  owner: string | null;
  /** True when the vaccination targets a whole customer / farm group (no specific pet). */
  isFarmGroup: boolean;
}

/** Resolve a vaccination's recipient (pet XOR farm group) to display names from cached reference data. */
export function resolveRecipient(v: VaccinationResponse, maps: RecipientMaps): RecipientLabel {
  if (v.petId) {
    const pet = maps.petById.get(v.petId);
    const owner = pet?.customerId ? (maps.customerById.get(pet.customerId)?.fullName ?? null) : null;
    return { name: pet?.name ?? null, owner, isFarmGroup: false };
  }
  if (v.customerId) {
    return {
      name: maps.customerById.get(v.customerId)?.fullName ?? null,
      owner: null,
      isFarmGroup: true,
    };
  }
  return { name: null, owner: null, isFarmGroup: false };
}
