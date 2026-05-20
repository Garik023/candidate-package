import { apiClient, buildQueryString } from './client';
import {
  Supplier,
  SupplierPerformance,
  PaginatedResponse,
} from '../types/api.types';

export async function getSuppliers(
  params: { limit?: number; offset?: number } = {}
): Promise<PaginatedResponse<Supplier>> {
  const queryString = buildQueryString(params);
  return apiClient<PaginatedResponse<Supplier>>(`/suppliers${queryString}`);
}

export async function getSupplier(id: string): Promise<Supplier> {
  return apiClient<Supplier>(`/suppliers/${id}`);
}

export async function getSupplierPerformance(
  id: string
): Promise<SupplierPerformance> {
  return apiClient<SupplierPerformance>(`/suppliers/${id}/performance`);
}
