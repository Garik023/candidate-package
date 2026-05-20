import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Supplier } from '../../database/entities/supplier.entity';
import { createPaginatedResponse, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    private dataSource: DataSource,
  ) {}

  async findAll(limit: number = 20, offset: number = 0): Promise<PaginatedResponse<Supplier>> {
    const [data, total] = await this.supplierRepository.findAndCount({
      take: limit,
      skip: offset,
      order: { id: 'ASC' },
    });

    return createPaginatedResponse(data, total, limit, offset);
  }

  async findOne(id: string): Promise<any> {
    const supplier = await this.supplierRepository.findOne({ where: { id } });
    
    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    // Get computed fields
    const stats = await this.dataSource.query(`
      SELECT 
        COUNT(*)::int as order_count,
        COALESCE(SUM(total_price), 0)::numeric as total_revenue
      FROM orders
      WHERE supplier_id = $1
    `, [id]);

    return {
      ...supplier,
      order_count: stats[0].order_count,
      total_revenue: parseFloat(stats[0].total_revenue),
    };
  }

  async getPerformance(id: string): Promise<any> {
    // Verify supplier exists
    const supplier = await this.supplierRepository.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }

    // Get orders for this supplier
    const orders = await this.dataSource.query(`
      SELECT 
        o.id,
        o.status,
        o.total_price,
        o.unit_price,
        o.created_at,
        o.updated_at,
        o.product_id,
        p.price as product_price
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      WHERE o.supplier_id = $1
    `, [id]);

    if (orders.length === 0) {
      return {
        avg_delivery_days: 0,
        rejection_rate: 0,
        avg_order_value: 0,
        monthly_trend: [],
        price_consistency: 0,
      };
    }

    // Calculate avg_delivery_days for delivered orders
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    let avgDeliveryDays = 0;
    if (deliveredOrders.length > 0) {
      const totalDays = deliveredOrders.reduce((sum, o) => {
        const created = new Date(o.created_at).getTime();
        const updated = new Date(o.updated_at).getTime();
        const days = (updated - created) / (1000 * 60 * 60 * 24);
        return sum + Math.max(0, days);
      }, 0);
      avgDeliveryDays = totalDays / deliveredOrders.length;
    }

    // Calculate rejection_rate
    const rejectedCount = orders.filter(o => o.status === 'rejected').length;
    const rejectionRate = orders.length > 0 ? rejectedCount / orders.length : 0;

    // Calculate avg_order_value
    const totalValue = orders.reduce((sum, o) => sum + parseFloat(o.total_price), 0);
    const avgOrderValue = orders.length > 0 ? totalValue / orders.length : 0;

    // Calculate monthly_trend
    const monthlyMap = new Map<string, number>();
    for (const order of orders) {
      const month = new Date(order.created_at).toISOString().slice(0, 7);
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
    }
    const monthlyTrend = Array.from(monthlyMap.entries())
      .map(([month, order_count]) => ({ month, order_count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate price_consistency
    // Fraction of orders where unit_price is within 20% of product base price
    let consistentCount = 0;
    let countWithPrice = 0;
    for (const order of orders) {
      if (order.product_price !== null && order.product_price > 0) {
        countWithPrice++;
        const unitPrice = parseFloat(order.unit_price);
        const basePrice = parseFloat(order.product_price);
        const lowerBound = basePrice * 0.8;
        const upperBound = basePrice * 1.2;
        if (unitPrice >= lowerBound && unitPrice <= upperBound) {
          consistentCount++;
        }
      }
    }
    const priceConsistency = countWithPrice > 0 ? consistentCount / countWithPrice : 0;

    return {
      avg_delivery_days: parseFloat(avgDeliveryDays.toFixed(2)),
      rejection_rate: parseFloat(rejectionRate.toFixed(3)),
      avg_order_value: parseFloat(avgOrderValue.toFixed(2)),
      monthly_trend: monthlyTrend,
      price_consistency: parseFloat(priceConsistency.toFixed(4)),
    };
  }
}
