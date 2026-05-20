import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getOrderStats } from '../api/orders.api';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#10b981',
  rejected: '#ef4444',
  shipped: '#3b82f6',
  delivered: '#8b5cf6',
  cancelled: '#6b7280',
};

export function AnalyticsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['order-stats'],
    queryFn: getOrderStats,
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  if (isLoading) {
    return <LoadingState message="Loading analytics..." />;
  }

  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load analytics'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return <ErrorState message="No data available" />;
  }

  const statusPieData = data.by_status.map(item => ({
    name: item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] || '#6b7280',
  }));

  const monthlyData = data.by_month.map(item => ({
    month: item.month,
    orders: item.order_count,
    revenue: item.revenue,
  }));

  return (
    <div className="analytics-page">
      <h1>Analytics Dashboard</h1>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{formatNumber(data.total_orders)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{formatCurrency(data.total_revenue)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Order Value</div>
          <div className="stat-value">{formatCurrency(data.avg_order_value)}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Order Status Distribution</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatNumber(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Monthly Order Volume</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11 }}
                  interval={2}
                />
                <YAxis tickFormatter={formatNumber} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    name === 'orders' ? formatNumber(value) : formatCurrency(value),
                    name === 'orders' ? 'Orders' : 'Revenue'
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card full-width">
          <h3>Top 10 Suppliers by Revenue</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={data.top_suppliers}
                layout="vertical"
                margin={{ left: 150 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatCurrency} />
                <YAxis 
                  type="category" 
                  dataKey="supplier_name"
                  tick={{ fontSize: 12 }}
                  width={140}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total_revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3>Orders by Warehouse</h3>
          <div className="warehouse-table">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Warehouse</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.by_warehouse.map(item => (
                  <tr key={item.warehouse}>
                    <td>{item.warehouse}</td>
                    <td>{formatNumber(item.count)}</td>
                    <td>{formatCurrency(item.total_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-card">
          <h3>Status Breakdown</h3>
          <div className="status-table">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {data.by_status.map(item => (
                  <tr key={item.status}>
                    <td>
                      <span 
                        className="status-dot" 
                        style={{ backgroundColor: STATUS_COLORS[item.status] }}
                      />
                      {item.status}
                    </td>
                    <td>{formatNumber(item.count)}</td>
                    <td>{formatCurrency(item.total_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
