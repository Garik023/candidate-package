import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('jobs')
export class Job {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 20, default: 'processing' })
  status: 'processing' | 'completed' | 'failed';

  @Column({ type: 'integer', default: 0 })
  total: number;

  @Column({ type: 'integer', default: 0 })
  completed: number;

  @Column({ type: 'integer', default: 0 })
  failed: number;

  @Column({ type: 'varchar', length: 20 })
  action: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;
}
