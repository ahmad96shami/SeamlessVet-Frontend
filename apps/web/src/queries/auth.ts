import { useMutation } from "@tanstack/react-query";
import type { ApiError, CenterOption, LoginRequest, LoginResponse, RegisterRequest } from "@vet/shared";

import { centers, login, register } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

/** Step one of tenant-routed login: a phone → the active centers it belongs to (M34). */
export function useCenters() {
  return useMutation<CenterOption[], ApiError, string>({ mutationFn: centers });
}

/**
 * Step two: sign in scoped to the picked center. `centerName` rides along so the store can label
 * the shell header (the JWT carries only `environment_id`) — it is not part of the API request.
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSessionFromLogin);
  return useMutation<LoginResponse, ApiError, { request: LoginRequest; centerName: string }>({
    mutationFn: ({ request }) => login(request),
    onSuccess: (res, { centerName }) => setSession(res, centerName),
  });
}

export function useRegister() {
  return useMutation<void, ApiError, RegisterRequest>({ mutationFn: register });
}
