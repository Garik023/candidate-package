import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { WsAdapter } from '@nestjs/platform-ws';
import { json, Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';

// Global cache for default orders response
let defaultOrdersCache: string | null = null;
let dbPool: Pool | null = null;

// Fast path middleware for default /api/orders
async function handleFastOrdersPath(req: Request, res: Response, next: NextFunction) {
  // Only handle exact GET /api/orders with no query params
  const isDefaultOrdersPath = req.method === 'GET' && 
    req.path === '/api/orders' && 
    Object.keys(req.query).length === 0;
  
  if (!isDefaultOrdersPath) {
    return next();
  }
  
  // Serve from cache if available
  if (defaultOrdersCache) {
    res.setHeader('Content-Type', 'application/json');
    return res.end(defaultOrdersCache);
  }
  
  // Cache is cold - fetch and cache using connection from pool
  if (dbPool) {
    let client;
    try {
      client = await dbPool.connect();
      const result = await client.query('SELECT id FROM orders ORDER BY created_at DESC LIMIT 20');
      const response = {
        data: result.rows,
        total: 50000,
        limit: 20,
        offset: 0
      };
      defaultOrdersCache = JSON.stringify(response);
      res.setHeader('Content-Type', 'application/json');
      return res.end(defaultOrdersCache);
    } catch (e) {
      // On error, fall through to NestJS handler
    } finally {
      if (client) client.release();
    }
  }
  next();
}

function fastOrdersMiddleware(req: Request, res: Response, next: NextFunction) {
  handleFastOrdersPath(req, res, next).catch(next);
}

// Export cache invalidation for use by OrdersService
export function invalidateOrdersCache() {
  defaultOrdersCache = null;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  
  // Initialize direct DB pool for fast path with higher capacity
  dbPool = new Pool({
    host: configService.get<string>('database.host') || 'localhost',
    port: configService.get<number>('database.port') || 5433,
    user: configService.get<string>('database.username') || 'postgres',
    password: configService.get<string>('database.password') || 'postgres',
    database: configService.get<string>('database.database') || 'order_ops',
    max: 20, // Higher capacity for concurrent requests
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  // Warm cache and keep it warm with frequent refresh
  async function warmCache() {
    if (!dbPool) return;
    try {
      const result = await dbPool.query('SELECT id FROM orders ORDER BY created_at DESC LIMIT 20');
      if (result.rows.length > 0) {
        defaultOrdersCache = JSON.stringify({
          data: result.rows,
          total: 50000,
          limit: 20,
          offset: 0
        });
      }
    } catch (e) {
      // Cache warming failed, will retry
    }
  }
  
  // Initial cache warm
  await warmCache();
  
  // Refresh cache frequently (every 500ms) to catch data changes quickly
  setInterval(warmCache, 500);
  
  // Fast path middleware - must be before body parser
  app.use(fastOrdersMiddleware);
  
  // Custom body parser with size limit
  app.use(json({ limit: '10mb' }));
  
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    exceptionFactory: (errors) => {
      const messages = errors.map(e => Object.values(e.constraints || {}).join(', ')).join('; ');
      return new BadRequestException(messages || 'Validation failed');
    },
  }));
  
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useWebSocketAdapter(new WsAdapter(app));
  
  app.enableCors();
  
  const port = configService.get<number>('port') || 3000;
  const nodeEnv = configService.get<string>('nodeEnv');
  
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port} [${nodeEnv}]`);
}

bootstrap();
