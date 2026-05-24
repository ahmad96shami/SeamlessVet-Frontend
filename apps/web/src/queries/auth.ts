import { useMutation } from "@tanstack/react-query";
import type { ApiError, LoginRequest, LoginResponse, RegisterRequest } from "@vet/shared";

import { login, register } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSessionFromLogin);
  return useMutation<LoginResponse, ApiError, LoginRequest>({
    mutationFn: login,
    onSuccess: setSession,
  });
}

export function useRegister() {
  return useMutation<void, ApiError, RegisterRequest>({ mutationFn: register });
}
