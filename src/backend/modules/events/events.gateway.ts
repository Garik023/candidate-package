import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'ws';
import { IncomingMessage } from 'http';

interface ClientInfo {
  ws: any;
  supplierId?: string;
}

@WebSocketGateway({ path: '/api/events' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clients: Map<any, ClientInfo> = new Map();

  handleConnection(client: any, request: IncomingMessage) {
    // Parse query params from URL
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const supplierId = url.searchParams.get('supplier_id') || undefined;

    this.clients.set(client, { ws: client, supplierId });
    console.log(`Client connected${supplierId ? ` (filtering by supplier: ${supplierId})` : ''}`);
  }

  handleDisconnect(client: any) {
    this.clients.delete(client);
    console.log('Client disconnected');
  }

  emitOrderUpdated(data: {
    id: string;
    old_status: string;
    new_status: string;
    updated_at: string | Date;
    supplier_id?: string;
  }) {
    const event = {
      type: 'order_updated',
      data: {
        id: data.id,
        old_status: data.old_status,
        new_status: data.new_status,
        updated_at: typeof data.updated_at === 'string' 
          ? data.updated_at 
          : data.updated_at.toISOString(),
      },
    };

    this.broadcast(event, data.supplier_id);
  }

  emitBulkCompleted(jobId: string) {
    const event = {
      type: 'bulk_completed',
      data: {
        jobId,
      },
    };

    this.broadcast(event);
  }

  private broadcast(event: any, supplierId?: string) {
    const message = JSON.stringify(event);

    for (const [client, info] of this.clients) {
      try {
        // If client has a supplier filter, only send if event matches
        if (info.supplierId) {
          // Client has a filter - only send if event's supplier matches
          if (!supplierId || info.supplierId !== supplierId) {
            continue;
          }
        }

        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      } catch (err) {
        console.error('Failed to send to client:', err);
      }
    }
  }
}
