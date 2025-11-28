import { apiClient } from './client';
import type { Request } from '../types';

export const requestsApi = {
  getAll: async (filters?: {
    tenantId?: string;
    unitId?: string;
    status?: 'PENDING' | 'RESOLVED';
    type?: 'CLEANING_SUPPLIES' | 'MAINTENANCE_ISSUE';
  }): Promise<Request[]> => {
    const response = await apiClient.get('/requests', { params: filters });
    return response.data;
  },

  getOne: async (id: string): Promise<Request> => {
    const response = await apiClient.get(`/requests/${id}`);
    return response.data;
  },

  create: async (
    tenantId: string,
    type: 'CLEANING_SUPPLIES' | 'MAINTENANCE_ISSUE',
    description: string,
    photoPath?: string
  ): Promise<Request> => {
    const response = await apiClient.post(
      '/requests',
      { type, description, photoPath },
      { params: { tenantId } }
    );
    return response.data;
  },

  resolve: async (
    id: string,
    resolvedBy: string,
    notes?: string
  ): Promise<Request> => {
    const response = await apiClient.patch(
      `/requests/${id}/resolve`,
      { notes },
      { params: { resolvedBy } }
    );
    return response.data;
  },
};
