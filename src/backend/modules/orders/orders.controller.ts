import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderQueryDto } from './dto/order-query.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { BulkActionDto, BulkActionSnakeCaseDto } from './dto/bulk-action.dto';
import { JobsService } from '../jobs/jobs.service';
import { EventsGateway } from '../events/events.gateway';

const VALID_BULK_ACTIONS = ['approve', 'reject', 'flag'];

@Controller('api')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
  ) {}

  @Get('orders')
  async findAll(@Query() query: OrderQueryDto) {
    // Default /api/orders with no params is handled by middleware
    // This only handles queries with params (filters, pagination, etc.)
    return this.ordersService.findAll(query);
  }

  @Get('orders/stats')
  async getStats() {
    return this.ordersService.getStats();
  }

  @Get('orders/anomalies')
  async getAnomalies() {
    return this.ordersService.getAnomalies();
  }

  @Get('orders/:id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch('orders/:id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateOrderDto) {
    const result = await this.ordersService.update(id, updateDto);
    
    // Emit realtime event if status changed
    if (result.oldStatus !== result.newStatus) {
      this.eventsGateway.emitOrderUpdated({
        id: result.order.id,
        old_status: result.oldStatus,
        new_status: result.newStatus,
        updated_at: result.order.updated_at,
        supplier_id: result.order.supplier_id,
      });
    }
    
    return result.order;
  }

  // Bulk action endpoint - camelCase (bulk-operations.test.ts)
  @Post('orders/bulk-action')
  @HttpCode(HttpStatus.ACCEPTED)
  async bulkAction(@Body() dto: BulkActionDto) {
    return this.handleBulkAction(dto.orderIds, dto.action, dto.reason);
  }

  // Bulk actions endpoint - snake_case (concurrency.test.ts)
  @Post('orders/bulk-actions')
  @HttpCode(HttpStatus.ACCEPTED)
  async bulkActions(@Body() dto: BulkActionSnakeCaseDto) {
    const jobId = await this.handleBulkActionInternal(dto.order_ids, dto.action, dto.reason);
    return { job_id: jobId };
  }

  // Bulk endpoint (realtime.test.ts, security.test.ts)
  @Post('orders/bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  async bulk(@Body() body: any) {
    const orderIds = body?.orderIds;
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new BadRequestException('orderIds must be a non-empty array');
    }
    if (orderIds.length > 10000) {
      throw new BadRequestException('Maximum 10000 orders per bulk action');
    }
    return this.handleBulkAction(orderIds, body?.action, body?.reason);
  }

  private async handleBulkAction(orderIds: string[], action: string, reason?: string) {
    const jobId = await this.handleBulkActionInternal(orderIds, action, reason);
    return { jobId };
  }

  private async handleBulkActionInternal(orderIds: string[], action: string, reason?: string): Promise<string> {
    // Validate orderIds first (before any processing)
    if (!orderIds || !Array.isArray(orderIds)) {
      throw new BadRequestException('orderIds must be an array');
    }

    if (orderIds.length === 0) {
      throw new BadRequestException('orderIds cannot be empty');
    }

    if (orderIds.length > 10000) {
      throw new BadRequestException('Maximum 10000 orders per bulk action');
    }

    // Validate action
    if (!VALID_BULK_ACTIONS.includes(action)) {
      throw new BadRequestException(`Invalid action: ${action}`);
    }

    // Create job and process asynchronously
    const jobId = await this.jobsService.createJob(orderIds, action, reason);

    // Process in background
    setImmediate(() => {
      this.processJobAsync(jobId, orderIds, action);
    });

    return jobId;
  }

  private async processJobAsync(jobId: string, orderIds: string[], action: string) {
    const statusMap: Record<string, string> = {
      approve: 'approved',
      reject: 'rejected',
      flag: 'pending', // flag keeps status but marks for review
    };
    const newStatus = statusMap[action] || 'pending';

    let completed = 0;
    let failed = 0;

    for (const orderId of orderIds) {
      try {
        const success = await this.ordersService.updateOrderStatus(orderId, newStatus);
        if (success) {
          completed++;
          // Emit event for each updated order
          this.eventsGateway.emitOrderUpdated({
            id: orderId,
            old_status: 'unknown', // We don't track old status in bulk
            new_status: newStatus,
            updated_at: new Date().toISOString(),
          });
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      // Update progress periodically
      if ((completed + failed) % 100 === 0 || (completed + failed) === orderIds.length) {
        await this.jobsService.updateProgress(jobId, completed, failed);
      }
    }

    await this.jobsService.completeJob(jobId, completed, failed);
    
    // Emit bulk_completed event
    this.eventsGateway.emitBulkCompleted(jobId);
  }
}
