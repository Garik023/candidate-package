import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import configuration from './config/configuration';
import { validationSchema } from './config/validation';

import { Order } from './database/entities/order.entity';
import { Supplier } from './database/entities/supplier.entity';
import { Product } from './database/entities/product.entity';
import { Category } from './database/entities/category.entity';
import { Job } from './database/entities/job.entity';

import { OrdersModule } from './modules/orders/orders.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ProductsModule } from './modules/products/products.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { EventsModule } from './modules/events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: true,
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [Order, Supplier, Product, Category, Job],
        synchronize: false,
        logging: false,
      }),
    }),
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [{
        rootPath: join(__dirname, '..', configService.get<string>('frontend.distPath') || '../frontend/dist'),
        exclude: ['/api/(.*)'],
      }],
    }),
    OrdersModule,
    SuppliersModule,
    ProductsModule,
    JobsModule,
    EventsModule,
  ],
})
export class AppModule {}
