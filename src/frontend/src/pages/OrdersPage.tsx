import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrders, bulkAction } from '../api/orders.api';
import { getSuppliers } from '../api/suppliers.api';
import { Order, OrdersQueryParams, OrderStatus, OrderPriority } from '../types/api.types';
import { useDebounce } from '../hooks/useDebounce';
import { useBulkJobPolling } from '../hooks/useBulkJobPolling';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { ConfirmDialog } from '../components/ConfirmDialog';

const STATUSES: OrderStatus[] = ['pending', 'approved', 'rejected', 'shipped', 'delivered', 'cancelled'];
const PRIORITIES: OrderPriority[] = ['low', 'medium', 'high', 'urgent'];
const WAREHOUSES = ['warehouse_north', 'warehouse_south', 'warehouse_east', 'warehouse_west', 'warehouse_central'];

type SortField = 'created_at' | 'total_price' | 'quantity' | 'status' | 'priority';

interface Filters {
  status: string;
  priority: string;
  supplier_id: string;
  warehouse: string;
  date_from: string;
  date_to: string;
  search: string;
}

export function OrdersPage() {
  const queryClient = useQueryClient();
  
  const [filters, setFilters] = useState<Filters>({
    status: '',
    priority: '',
    supplier_id: '',
    warehouse: '',
    date_from: '',
    date_to: '',
    search: '',
  });
  const [offset, setOffset] = useState(0);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkDialogAction, setBulkDialogAction] = useState<'approve' | 'reject' | 'flag'>('approve');
  const [bulkError, setBulkError] = useState<string | null>(null);
  
  const limit = 20;
  const debouncedSearch = useDebounce(filters.search, 300);

  const queryParams: OrdersQueryParams = useMemo(() => ({
    limit,
    offset,
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    supplier_id: filters.supplier_id || undefined,
    warehouse: filters.warehouse || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    search: debouncedSearch || undefined,
    sort: sortField,
    order: sortOrder,
  }), [filters, offset, sortField, sortOrder, debouncedSearch]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders', queryParams],
    queryFn: () => getOrders(queryParams),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => getSuppliers({ limit: 500 }),
  });

  const handleBulkComplete = useCallback(() => {
    setSelectedIds(new Set());
    setBulkDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [queryClient]);

  const { job: bulkJob, isPolling, startPolling, reset: resetPolling } = useBulkJobPolling(handleBulkComplete);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setOffset(0);
    setSelectedIds(new Set());
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortField(field);
      setSortOrder('DESC');
    }
  };

  const handleSelectAll = () => {
    if (!data?.data) return;
    
    const allIds = data.data.map(o => o.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const openBulkDialog = (action: 'approve' | 'reject' | 'flag') => {
    setBulkDialogAction(action);
    setBulkDialogOpen(true);
    setBulkError(null);
    resetPolling();
  };

  const handleBulkConfirm = async () => {
    if (selectedIds.size === 0) return;

    try {
      setBulkError(null);
      const result = await bulkAction({
        orderIds: Array.from(selectedIds),
        action: bulkDialogAction,
      });
      startPolling(result.jobId);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk action failed');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortOrder === 'ASC' ? '↑' : '↓';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
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

  return (
    <div className="orders-page">
      <div className="page-header">
        <h1>Orders</h1>
        <div className="bulk-actions">
          <button
            className="btn btn-success"
            disabled={selectedIds.size === 0}
            onClick={() => openBulkDialog('approve')}
          >
            Approve ({selectedIds.size})
          </button>
          <button
            className="btn btn-danger"
            disabled={selectedIds.size === 0}
            onClick={() => openBulkDialog('reject')}
          >
            Reject ({selectedIds.size})
          </button>
          <button
            className="btn btn-warning"
            disabled={selectedIds.size === 0}
            onClick={() => openBulkDialog('flag')}
          >
            Flag ({selectedIds.size})
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search products..."
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
            className="filter-input search-input"
          />
          <select
            value={filters.status}
            onChange={e => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={e => handleFilterChange('priority', e.target.value)}
            className="filter-select"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={filters.supplier_id}
            onChange={e => handleFilterChange('supplier_id', e.target.value)}
            className="filter-select"
          >
            <option value="">All Suppliers</option>
            {suppliersData?.data.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-row">
          <select
            value={filters.warehouse}
            onChange={e => handleFilterChange('warehouse', e.target.value)}
            className="filter-select"
          >
            <option value="">All Warehouses</option>
            {WAREHOUSES.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.date_from}
            onChange={e => handleFilterChange('date_from', e.target.value)}
            className="filter-input"
            placeholder="From Date"
          />
          <input
            type="date"
            value={filters.date_to}
            onChange={e => handleFilterChange('date_to', e.target.value)}
            className="filter-input"
            placeholder="To Date"
          />
          <button
            className="btn"
            onClick={() => {
              setFilters({
                status: '',
                priority: '',
                supplier_id: '',
                warehouse: '',
                date_from: '',
                date_to: '',
                search: '',
              });
              setOffset(0);
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {isLoading && <LoadingState message="Loading orders..." />}
      
      {isError && (
        <ErrorState
          message={error instanceof Error ? error.message : 'Failed to load orders'}
          onRetry={() => refetch()}
        />
      )}

      {data && data.data.length === 0 && (
        <EmptyState
          title="No orders found"
          message="Try adjusting your filters or search criteria."
        />
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={data.data.every(o => selectedIds.has(o.id))}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Order ID</th>
                  <th>Supplier</th>
                  <th>Product</th>
                  <th onClick={() => handleSort('quantity')} className="sortable">
                    Qty {getSortIcon('quantity')}
                  </th>
                  <th onClick={() => handleSort('total_price')} className="sortable">
                    Total {getSortIcon('total_price')}
                  </th>
                  <th onClick={() => handleSort('status')} className="sortable">
                    Status {getSortIcon('status')}
                  </th>
                  <th onClick={() => handleSort('priority')} className="sortable">
                    Priority {getSortIcon('priority')}
                  </th>
                  <th onClick={() => handleSort('created_at')} className="sortable">
                    Created {getSortIcon('created_at')}
                  </th>
                  <th>Warehouse</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((order: Order) => (
                  <tr key={order.id} className={selectedIds.has(order.id) ? 'selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => handleSelectRow(order.id)}
                      />
                    </td>
                    <td className="order-id">{order.id}</td>
                    <td>
                      <Link to={`/suppliers/${order.supplier_id}`} className="supplier-link">
                        {order.supplier_name || order.supplier_id}
                      </Link>
                    </td>
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
                    <td>{order.warehouse || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            total={data.total}
            limit={limit}
            offset={offset}
            onPageChange={setOffset}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={bulkDialogOpen}
        title={`${bulkDialogAction.charAt(0).toUpperCase() + bulkDialogAction.slice(1)} Orders`}
        message={
          isPolling && bulkJob
            ? `Processing: ${bulkJob.progress.completed + bulkJob.progress.failed}/${bulkJob.progress.total} (${bulkJob.progress.completed} succeeded, ${bulkJob.progress.failed} failed)`
            : bulkJob?.status === 'completed'
            ? `Completed: ${bulkJob.progress.completed} succeeded, ${bulkJob.progress.failed} failed`
            : bulkError
            ? `Error: ${bulkError}`
            : `Are you sure you want to ${bulkDialogAction} ${selectedIds.size} order(s)?`
        }
        confirmLabel={isPolling ? 'Processing...' : bulkJob?.status === 'completed' ? 'Done' : bulkDialogAction.charAt(0).toUpperCase() + bulkDialogAction.slice(1)}
        onConfirm={bulkJob?.status === 'completed' ? handleBulkComplete : handleBulkConfirm}
        onCancel={() => {
          setBulkDialogOpen(false);
          resetPolling();
        }}
        isLoading={isPolling}
      />
    </div>
  );
}
