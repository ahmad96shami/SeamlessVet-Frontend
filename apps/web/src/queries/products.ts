import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
  type ApiError,
  type IdentifierResponse,
  type ProductListParams,
  type ProductRequest,
  type ProductResponse,
} from "@vet/shared";

import { apiClient } from "@/services/apiClient";

const KEY = "products";

export function useProducts(params: ProductListParams) {
  return useQuery<ProductResponse[], ApiError>({
    queryKey: [KEY, params],
    queryFn: () => listProducts(apiClient, params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, ProductRequest>({
    mutationFn: (body) => createProduct(apiClient, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation<IdentifierResponse, ApiError, { id: string; body: ProductRequest }>({
    mutationFn: ({ id, body }) => updateProduct(apiClient, id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => deleteProduct(apiClient, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
