import { DataSource } from 'typeorm';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';

import { Category } from '../entities/category.entity';
import { Supplier } from '../entities/supplier.entity';
import { Product } from '../entities/product.entity';
import { Order } from '../entities/order.entity';

export class ImportService {
  constructor(private dataSource: DataSource) {}

  async importAll(dataDir: string): Promise<void> {
    console.log('Starting data import...');
    
    await this.importCategories(path.join(dataDir, 'categories.csv'));
    await this.importSuppliers(path.join(dataDir, 'suppliers.csv'));
    await this.importProducts(path.join(dataDir, 'products.csv'));
    await this.importOrders(path.join(dataDir, 'orders.csv'));
    
    console.log('Data import completed!');
  }

  private async parseCSV<T>(filePath: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const records: T[] = [];
      const parser = fs
        .createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }));

      parser.on('data', (record) => records.push(record));
      parser.on('error', reject);
      parser.on('end', () => resolve(records));
    });
  }

  async importCategories(filePath: string): Promise<void> {
    console.log('Importing categories...');
    const records = await this.parseCSV<any>(filePath);
    
    const categories = records.map(r => ({
      id: r.id,
      name: r.name,
      parent_id: r.parent_id || null,
    }));

    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(Category)
      .values(categories)
      .orIgnore()
      .execute();
    
    console.log(`Imported ${categories.length} categories`);
  }

  async importSuppliers(filePath: string): Promise<void> {
    console.log('Importing suppliers...');
    const records = await this.parseCSV<any>(filePath);
    
    const suppliers = records.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email || null,
      rating: r.rating ? parseFloat(r.rating) : null,
      country: r.country || null,
      active: r.active === 'true',
      created_at: r.created_at ? new Date(r.created_at) : null,
    }));

    const batchSize = 100;
    for (let i = 0; i < suppliers.length; i += batchSize) {
      const batch = suppliers.slice(i, i + batchSize);
      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(Supplier)
        .values(batch)
        .orIgnore()
        .execute();
    }
    
    console.log(`Imported ${suppliers.length} suppliers`);
  }

  async importProducts(filePath: string): Promise<void> {
    console.log('Importing products...');
    const records = await this.parseCSV<any>(filePath);
    
    const products = records.map(r => ({
      id: r.id,
      name: r.name,
      category_id: r.category_id || null,
      sku: r.sku || null,
      price: r.price ? parseFloat(r.price) : null,
    }));

    const batchSize = 500;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(Product)
        .values(batch)
        .orIgnore()
        .execute();
    }
    
    console.log(`Imported ${products.length} products`);
  }

  async importOrders(filePath: string): Promise<void> {
    console.log('Importing orders...');
    const records = await this.parseCSV<any>(filePath);
    
    const orders = records.map(r => ({
      id: r.id,
      supplier_id: r.supplier_id,
      product_id: r.product_id,
      quantity: parseInt(r.quantity, 10),
      unit_price: parseFloat(r.unit_price),
      total_price: parseFloat(r.total_price),
      status: r.status,
      priority: r.priority,
      created_at: new Date(r.created_at),
      updated_at: new Date(r.updated_at),
      warehouse: r.warehouse || null,
      notes: r.notes || null,
    }));

    const batchSize = 1000;
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(Order)
        .values(batch)
        .orIgnore()
        .execute();
      
      if ((i + batchSize) % 10000 === 0) {
        console.log(`  Imported ${Math.min(i + batchSize, orders.length)}/${orders.length} orders`);
      }
    }
    
    console.log(`Imported ${orders.length} orders`);
  }
}
