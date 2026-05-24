import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";

import { login } from "../api/auth";
import type { ApiError } from "../http";
import type { LoginRequest, LoginResponse } from "../schemas/auth";

/**
 * Reference TanStack Query hook completing the per-endpoint triplet
 * (Zod schema → Axios wrapper → hook). The host app passes its configured Axios client.
 * Imported via "@vet/shared/queries" so the root entry stays React-free.
 */
export function useLogin(
  client: AxiosInstance,
  options?: Omit<UseMutationOptions<LoginResponse, ApiError, LoginRequest>, "mutationFn">,
) {
  return useMutation<LoginResponse, ApiError, LoginRequest>({
    mutationFn: (body) => login(client, body),
    ...options,
  });
}
