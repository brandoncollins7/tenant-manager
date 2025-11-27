import { apiClient } from './client';
import type { SwapRequest } from '../types';

export const swapsApi = {
  getAll: async (occupantId: string): Promise<SwapRequest[]> => {
    const response = await apiClient.get('/swaps', { params: { occupantId } });
    return response.data;
  },

  create: async (
    requesterId: string,
    targetId: string,
    weekId: string,
    reason?: string
  ): Promise<SwapRequest> => {
    const response = await apiClient.post('/swaps', { targetId, weekId, reason }, {
      params: { requesterId },
    });
    return response.data;
  },

  respond: async (id: string, approved: boolean): Promise<SwapRequest> => {
    const response = await apiClient.patch(`/swaps/${id}/respond`, { approved });
    return response.data;
  },

  cancel: async (id: string, requesterId: string): Promise<SwapRequest> => {
    const response = await apiClient.delete(`/swaps/${id}`, {
      params: { requesterId },
    });
    return response.data;
  },
};
