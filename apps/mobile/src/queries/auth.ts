import { useMutation } from "@tanstack/react-query";
import type { LoginRequest, LoginResponse, RegisterRequest } from "@vet/shared";

import { login, register } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

/** POST /auth/login — on success, persists tokens + flips the auth store. */
export function useLogin() {
  const setSessionFromLogin = useAuthStore((s) => s.setSessionFromLogin);
  return useMutation<LoginResponse, unknown, LoginRequest>({
    mutationFn: login,
    onSuccess: (res) => setSessionFromLogin(res),
  });
}

/** POST /auth/register — creates an inactive account + pending request. */
export function useRegister() {
  return useMutation<void, unknown, RegisterRequest>({
    mutationFn: register,
  });
}
