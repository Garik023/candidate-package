import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getSupplier, getSupplierPerformance } from '../api/suppliers.api';
import { getOrders } from '../api/orders.api';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { Order, OrderStatus, OrderPriority } from '../types/api.types';

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ordersOffset, setOrdersOffset] = useState(0);
  const ordersLimit = 10;

  const { data: supplier, isLoading: supplierLoading, isError: supplierError, error: supplierErr, refetch: refetchSupplier } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => getSupplier(id!),
    enabled: !!id,
  });

  const { data: performance, isLoading: performanceLoading, isError: performanceError } = useQuery({
    queryKey: ['supplier-performance', id],
    queryFn: () => getSupplierPerformance(id!),
    enabled: !!id,
  });

  const { data: orders, isLoading: ordersLoading, isError: ordersError } = useQuery({
    queryKey: ['supplier-orders', id, ordersOffset],
    queryFn: () => getOrders({ supplier_id: id, limit: ordersLimit, offset: ordersOffset }),
    enabled: !!id,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: OrderStatus) => {
    const colors: Record<OrderStatus, string> = {
      pending: 'status-pending',
      approved: 'status-approved',
      rejected: 'status-rejected',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled',
    };
    return colors[status];
  };

  const getPriorityColor = (priority: OrderPriority) => {
    const colors: Record<OrderPriority, string> = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      urgent: 'priority-urgent',
    };
    return colors[priority];
  };

  const isLoading = supplierLoading || performanceLoading;

  if (isLoading) {
    return <LoadingState message="Loading supplier details..." />;
  }

  if (supplierError) {
    return (
      <ErrorState
        message={supplierErr instanceof Error ? supplierErr.message : 'Supplier not found'}
        onRetry={() => refetchSupplier()}
      />
    );
  }

  if (!supplier) {
    return <ErrorState message="Supplier not found" />;
  }

  return (
    <div className="supplier-detail-page">
      <div className="page-header">
        <Link to="/" className="back-link">← Back to Orders</Link>
        <h1>{supplier.name}</h1>
      </div>

      <div className="supplier-info-grid">
        <div className="info-card">
          <h3>Supplier Information</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">ID:</span>
              <span className="info-value">{supplier.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{supplier.email}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Country:</span>
              <span className="info-value">{supplier.country}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Rating:</span>
              <span className="info-value">{'⭐'.repeat(Math.round(supplier.rating))} ({supplier.rating.toFixed(1)})</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status:</span>
              <span className={`info-value ${supplier.active ? 'text-success' : 'text-danger'}`}>
                {supplier.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Member Since:</span>
              <span className="info-value">{formatDate(supplier.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="info-card">
          <h3>Order Statistics</h3>
          <div className="stats-mini">
            <div className="stat-mini">
              <div className="stat-mini-value">{supplier.order_count?.toLocaleString() || 0}</div>
              <div className="stat-mini-label">Total Orders</div>
            </div>
            <div className="stat-mini">
              <div className="stat-mini-value">{formatCurrency(supplier.total_revenue || 0)}</div>
              <div className="stat-mini-label">Total Revenue</div>
            </div>
          </div>
        </div>

        {performance && !performanceError && (
          <div className="info-card">
            <h3>Performance Metrics</h3>
            <div className="metrics-grid">
              <div className="metric">
                <div className="metric-value">{performance.avg_delivery_days.toFixed(1)} days</div>
                <div className="metric-label">Avg Delivery Time</div>
              </div>
              <div className="metric">
                <div className="metric-value">{formatPercent(performance.rejection_rate)}</div>
                <div className="metric-label">Rejection Rate</div>
              </div>
              <div className="metric">
                <div className="metric-value">{formatCurrency(performance.avg_order_value)}</div>
                <div className="metric-label">Avg Order Value</div>
              </div>
              <div className="metric">
                <div className="metric-value">{formatPercent(performance.price_consistency)}</div>
                <div className="metric-label">Price Consistency</div>
              </div>
            </div>
          </div>
        )}

        {performance && performance.monthly_trend.length > 0 && (
          <div className="info-card full-width">
            <h3>Monthly Trend</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={performance.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={2} />
                  <YAxis yAxisId="left" tickFormatter={(v) => v.toLocaleString()} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'order_count' ? value.toLocaleString() : formatCurrency(value),
                      name === 'order_count' ? 'Orders' : 'Revenue'
                    ]}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="order_count" stroke="#3b82f6" name="order_count" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" name="revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="supplier-orders-section">
        <h2>Order History</h2>
        
        {ordersLoading && <LoadingState message="Loading orders..." />}
        
        {ordersError && <ErrorState message="Failed to load orders" />}
        
        {orders && orders.data.length === 0 && (
          <EmptyState title="No orders" message="This supplier has no orders yet." />
        )}
        
        {orders && orders.data.length > 0 && (
          <>
            <div className="table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data.map((order: Order) => (
                    <tr key={order.id}>
                      <td className="order-id">{order.id}</td>
                      <td>{order.product_name || order.product_id}</td>
                      <td>{order.quantity}</td>
                      <td>{formatCurrency(order.total_price)}</td>
                      <td>
                        <span className={`status-badge ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <span className={`priority-badge ${getPriorityColor(order.priority)}`}>
                          {order.priority}
                        </span>
                      </td>
                      <td>{formatDate(order.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <Pagination
              total={orders.total}
              limit={ordersLimit}
              offset={ordersOffset}
              onPageChange={setOrdersOffset}
            />
          </>
        )}
      </div>
    </div>
  );
}
