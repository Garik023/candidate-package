import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index, VersionColumn } from 'typeorm';
import { Supplier } from './supplier.entity';
import { Product } from './product.entity';

@Entity('orders')
@Index('idx_orders_status', ['status'])
@Index('idx_orders_priority', ['priority'])
@Index('idx_orders_supplier_id', ['supplier_id'])
@Index('idx_orders_product_id', ['product_id'])
@Index('idx_orders_created_at', ['created_at'])
@Index('idx_orders_warehouse', ['warehouse'])
@Index('idx_orders_total_price', ['total_price'])
export class Order {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  supplier_id: string;

  @Column({ type: 'varchar', length: 20 })
  product_id: string;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_price: number;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'varchar', length: 20 })
  priority: string;

  @Column({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz' })
  updated_at: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  warehouse: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @VersionColumn()
  version: number;

  @ManyToOne(() => Supplier, supplier => supplier.orders)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ManyToOne(() => Product, product => product.orders)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
