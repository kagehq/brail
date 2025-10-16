import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      process.env.WEB_URL,
    ].filter((url): url is string => typeof url === 'string'),
    credentials: true,
  },
  namespace: '/logs',
})
export class LogsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LogsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-deploy')
  handleSubscribeDeploy(client: Socket, deployId: string) {
    this.logger.log(`Client ${client.id} subscribing to deploy: ${deployId}`);
    client.join(`deploy:${deployId}`);
    return { event: 'subscribed', data: { deployId } };
  }

  @SubscribeMessage('unsubscribe-deploy')
  handleUnsubscribeDeploy(client: Socket, deployId: string) {
    this.logger.log(`Client ${client.id} unsubscribing from deploy: ${deployId}`);
    client.leave(`deploy:${deployId}`);
    return { event: 'unsubscribed', data: { deployId } };
  }

  // Method to emit logs to all clients subscribed to a deploy
  emitLog(deployId: string, log: {
    id: string;
    level: string;
    message: string;
    timestamp: Date;
    metadata?: any;
  }) {
    this.server.to(`deploy:${deployId}`).emit('log', log);
  }

  // Method to emit deployment status updates
  emitStatus(deployId: string, status: {
    status: string;
    message?: string;
  }) {
    this.server.to(`deploy:${deployId}`).emit('status', status);
  }
}

