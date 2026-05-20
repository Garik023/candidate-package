import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { Order } from './order.entity';

@Entity('suppliers')
export class Supplier {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  rating: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  country: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  created_at: Date | null;

  @OneToMany(() => Order, order => order.supplier)
  orders: Order[];
}
