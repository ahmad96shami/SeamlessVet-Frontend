import { useMutation } from "@tanstack/react-query";
import type { ApiError, CenterOption, LoginRequest, LoginResponse, RegisterRequest } from "@vet/shared";

import { centers, login, register } from "@/api/auth";
import { rememberLogin } from "@/services/centerMemory";
import { useAuthStore } from "@/stores/authStore";

/** Step one of tenant-routed login: a phone → the active centers it belongs to (M34). */
export function useCenters() {
  return useMutation<CenterOption[], ApiError, string>({ mutationFn: centers });
}

/**
 * Step two: sign in scoped to the picked center. The chosen `center` rides along (NOT part of the
 * API request) so the store can label the shell header (the JWT carries only `environment_id`) and
 * the phone+center are remembered. Both run in the hook-level onSuccess — the mutate-level callback
 * would be skipped, since a successful login unmounts LoginPage on the redirect.
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSessionFromLogin);
  return useMutation<LoginResponse, ApiError, { request: LoginRequest; center: CenterOption }>({
    mutationFn: ({ request }) => login(request),
    onSuccess: (res, { request, center }) => {
      setSession(res, center.name);
      rememberLogin(request.phonePrimary, center);
    },
  });
}

export function useRegister() {
  return useMutation<void, ApiError, RegisterRequest>({ mutationFn: register });
}
