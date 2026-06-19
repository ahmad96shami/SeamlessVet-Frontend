import { useMutation } from "@tanstack/react-query";
import type { CenterOption, LoginRequest, LoginResponse, RegisterRequest } from "@vet/shared";

import { centers, login, register } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

/** POST /auth/centers — step one of tenant-routed login: a phone → the active centers it belongs to (Mo13). */
export function useCenters() {
  return useMutation<CenterOption[], unknown, string>({ mutationFn: centers });
}

/**
 * POST /auth/login — step two, scoped to the picked center. The chosen `center` rides along (NOT
 * part of the API request) so the store can label the field header (the JWT carries only
 * `environment_id`). On success, persists tokens + flips the auth store.
 */
export function useLogin() {
  const setSessionFromLogin = useAuthStore((s) => s.setSessionFromLogin);
  return useMutation<LoginResponse, unknown, { request: LoginRequest; center: CenterOption }>({
    mutationFn: ({ request }) => login(request),
    onSuccess: (res, { center }) => setSessionFromLogin(res, center.name),
  });
}

/** POST /auth/register — creates an inactive account + pending request. */
export function useRegister() {
  return useMutation<void, unknown, RegisterRequest>({
    mutationFn: register,
  });
}
