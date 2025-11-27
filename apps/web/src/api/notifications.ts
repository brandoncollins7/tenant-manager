import { apiClient } from './client';
import type { Notification } from '../types';

export const notificationsApi = {
  getAll: async (unreadOnly = false): Promise<Notification[]> => {
    const response = await apiClient.get('/notifications', {
      params: { unreadOnly },
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const response = await apiClient.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },
};
