import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  metadata?: any;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      process.env.WEB_URL,
    ].filter((url): url is string => typeof url === 'string'),
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-site')
  handleSubscribeSite(client: Socket, siteId: string) {
    this.logger.log(`Client ${client.id} subscribing to site: ${siteId}`);
    client.join(`site:${siteId}`);
    return { event: 'subscribed', data: { siteId } };
  }

  @SubscribeMessage('unsubscribe-site')
  handleUnsubscribeSite(client: Socket, siteId: string) {
    this.logger.log(`Client ${client.id} unsubscribing from site: ${siteId}`);
    client.leave(`site:${siteId}`);
    return { event: 'unsubscribed', data: { siteId } };
  }

  // Emit notification to all clients subscribed to a site
  emitToSite(siteId: string, notification: Notification) {
    this.server.to(`site:${siteId}`).emit('notification', notification);
  }

  // Emit notification to all connected clients (global)
  emitGlobal(notification: Notification) {
    this.server.emit('notification', notification);
  }

  // Helper methods for common notifications
  notifyDeploymentComplete(siteId: string, deployId: string) {
    this.emitToSite(siteId, {
      id: `deploy-complete-${deployId}`,
      type: 'success',
      title: 'Deployment Complete',
      message: 'Your deployment has finished successfully',
      timestamp: new Date(),
      metadata: { deployId },
    });
  }

  notifyDeploymentFailed(siteId: string, deployId: string, error: string) {
    this.emitToSite(siteId, {
      id: `deploy-failed-${deployId}`,
      type: 'error',
      title: 'Deployment Failed',
      message: error,
      timestamp: new Date(),
      metadata: { deployId },
    });
  }

  notifyFileUploaded(siteId: string, fileName: string) {
    this.emitToSite(siteId, {
      id: `file-uploaded-${Date.now()}`,
      type: 'info',
      title: 'File Uploaded',
      message: `${fileName} has been uploaded`,
      timestamp: new Date(),
      metadata: { fileName },
    });
  }
}

