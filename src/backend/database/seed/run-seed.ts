import { DataSource } from 'typeorm';
import * as path from 'path';
import { ImportService } from './import.service';

import { Category } from '../entities/category.entity';
import { Supplier } from '../entities/supplier.entity';
import { Product } from '../entities/product.entity';
import { Order } from '../entities/order.entity';
import { Job } from '../entities/job.entity';

async function main() {
  const host = process.env.DB_HOST || '172.18.0.2';
  console.log(`Connecting to database at ${host}...`);
  
  const dataSource = new DataSource({
    type: 'postgres',
    host,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'order_ops',
    entities: [Category, Supplier, Product, Order, Job],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();
  console.log('Database connected');

  const importService = new ImportService(dataSource);
  const dataDir = path.resolve(__dirname, '../../../../data');
  
  await importService.importAll(dataDir);
  
  await dataSource.destroy();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error during import:', err);
  process.exit(1);
});
