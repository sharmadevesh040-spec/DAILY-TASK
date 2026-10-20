import api from './api';
import { NotificationItem, Pagination } from '../types';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const notificationService = {
  async getNotifications(params?: {
    unreadOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    notifications: NotificationItem[];
    unreadCount: number;
    pagination: Pagination;
  }> {
    const q = new URLSearchParams();
    if (params?.unreadOnly) q.set('unreadOnly', 'true');
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));

    const { data } = await api.get(`/notifications?${q.toString()}`);
    return data.data;
  },

  async markAsRead(id: string): Promise<{ notification: NotificationItem; unreadCount: number }> {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data.data;
  },

  async markAllAsRead(): Promise<{ unreadCount: number }> {
    const { data } = await api.patch('/notifications/read-all');
    return data.data;
  },

  async deleteNotification(id: string): Promise<{ unreadCount: number }> {
    const { data } = await api.delete(`/notifications/${id}`);
    return data.data;
  },

  /**
   * Check if browser supports Web Push
   */
  isPushSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  getPermissionState(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
    return Notification.permission;
  },

  /**
   * Requests permission and subscribes browser to Web Push
   */
  async subscribePush(): Promise<{ success: boolean; message: string }> {
    if (!this.isPushSupported()) {
      return { success: false, message: 'Push notifications are not supported in this browser.' };
    }

    try {
      // 1. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          message:
            permission === 'denied'
              ? 'Push notification permission was denied. Please allow notifications in your browser settings.'
              : 'Notification permission request was dismissed.',
        };
      }

      // 2. Fetch VAPID public key
      const { data } = await api.get('/notifications/vapid-public-key');
      const vapidKey = data.data.publicKey;
      if (!vapidKey) {
        return { success: false, message: 'Server did not provide VAPID public key.' };
      }

      // 3. Register / get Service Worker registration
      const registration = await navigator.serviceWorker.ready;

      // 4. Subscribe with PushManager
      const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // 5. Send subscription to server
      const subscriptionJson = subscription.toJSON();
      await api.post('/notifications/subscribe', {
        endpoint: subscriptionJson.endpoint,
        keys: subscriptionJson.keys,
      });

      return { success: true, message: 'Push notifications enabled successfully! 🔔' };
    } catch (err: any) {
      console.error('Error subscribing to push:', err);
      return { success: false, message: err?.message || 'Failed to enable push notifications.' };
    }
  },

  /**
   * Unsubscribe from Web Push
   */
  async unsubscribePush(): Promise<void> {
    if (!this.isPushSupported()) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
    } catch (err) {
      console.warn('Error unsubscribing push:', err);
    }
  },
};
