import { apiClient, buildQueryString } from './client';
import {
  Order,
  OrdersQueryParams,
  OrderStats,
  PaginatedResponse,
  BulkActionRequest,
  BulkActionResponse,
} from '../types/api.types';

export async function getOrders(
  params: OrdersQueryParams = {}
): Promise<PaginatedResponse<Order>> {
  const queryString = buildQueryString(params);
  return apiClient<PaginatedResponse<Order>>(`/orders${queryString}`);
}

export async function getOrder(id: string): Promise<Order> {
  return apiClient<Order>(`/orders/${id}`);
}

export async function updateOrder(
  id: string,
  data: Partial<Pick<Order, 'status' | 'priority' | 'notes'>>
): Promise<Order> {
  return apiClient<Order>(`/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getOrderStats(): Promise<OrderStats> {
  return apiClient<OrderStats>('/orders/stats');
}

export async function getOrderAnomalies(): Promise<PaginatedResponse<unknown>> {
  return apiClient<PaginatedResponse<unknown>>('/orders/anomalies');
}

export async function bulkAction(
  request: BulkActionRequest
): Promise<BulkActionResponse> {
  return apiClient<BulkActionResponse>('/orders/bulk-action', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
