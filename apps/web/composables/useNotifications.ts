import { io, Socket } from 'socket.io-client';
import { toast } from 'vue-sonner';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  metadata?: any;
}

// Singleton socket instance
let socket: Socket | null = null;

export const useNotifications = () => {
  const config = useRuntimeConfig();

  const connect = () => {
    if (socket?.connected) return socket;

    socket = io(`${config.public.apiUrl}/notifications`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('✅ Notifications connected');
    });

    socket.on('disconnect', () => {
      console.log('❌ Notifications disconnected');
    });

    socket.on('notification', (notification: Notification) => {
      handleNotification(notification);
    });

    socket.on('error', (error: any) => {
      console.error('Notifications error:', error);
    });

    return socket;
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  };

  const subscribeSite = (siteId: string) => {
    if (!socket?.connected) connect();
    socket?.emit('subscribe-site', siteId);
  };

  const unsubscribeSite = (siteId: string) => {
    socket?.emit('unsubscribe-site', siteId);
  };

  const handleNotification = (notification: Notification) => {
    console.log('📬 Notification received:', notification);

    switch (notification.type) {
      case 'success':
        toast.success(notification.title, {
          description: notification.message
        });
        break;
      case 'error':
        toast.error(notification.title, {
          description: notification.message
        });
        break;
      case 'warning':
        toast.warning(notification.title, {
          description: notification.message
        });
        break;
      case 'info':
      default:
        toast.info(notification.title, {
          description: notification.message
        });
        break;
    }
  };

  return {
    connect,
    disconnect,
    subscribeSite,
    unsubscribeSite,
  };
};

