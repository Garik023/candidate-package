export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiError {
  error: string;
  code: string;
}

export interface Order {
  id: string;
  supplier_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: OrderStatus;
  priority: OrderPriority;
  created_at: string;
  updated_at: string;
  warehouse: string | null;
  notes: string | null;
  supplier_name?: string;
  product_name?: string;
}

export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'shipped' | 'delivered' | 'cancelled';
export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface OrdersQueryParams {
  limit?: number;
  offset?: number;
  status?: string;
  priority?: string;
  supplier_id?: string;
  warehouse?: string;
  date_from?: string;
  date_to?: string;
  min_total?: number;
  search?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  rating: number;
  country: string;
  active: boolean;
  created_at: string;
  order_count?: number;
  total_revenue?: number;
}

export interface SupplierPerformance {
  avg_delivery_days: number;
  rejection_rate: number;
  avg_order_value: number;
  price_consistency: number;
  monthly_trend: MonthlyTrend[];
}

export interface MonthlyTrend {
  month: string;
  order_count: number;
  revenue: number;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  sku: string;
  price: number;
}

export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  by_status: StatusStat[];
  by_month: MonthStat[];
  top_suppliers: TopSupplier[];
  by_warehouse: WarehouseStat[];
}

export interface StatusStat {
  status: string;
  count: number;
  total_value: number;
}

export interface MonthStat {
  month: string;
  order_count: number;
  revenue: number;
}

export interface TopSupplier {
  supplier_id: string;
  supplier_name: string;
  total_revenue: number;
}

export interface WarehouseStat {
  warehouse: string;
  count: number;
  total_value: number;
}

export interface BulkActionRequest {
  orderIds: string[];
  action: 'approve' | 'reject' | 'flag';
  reason?: string;
}

export interface BulkActionResponse {
  jobId: string;
}

export interface Job {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
}
