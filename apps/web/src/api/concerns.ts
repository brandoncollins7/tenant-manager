import { apiClient } from './client';
import type { Concern, ConcernType, ConcernSeverity, ConcernStatus } from '../types';

export const concernsApi = {
  getAll: async (filters?: {
    reporterId?: string;
    reportedId?: string;
    unitId?: string;
    status?: ConcernStatus;
    type?: ConcernType;
  }): Promise<Concern[]> => {
    const response = await apiClient.get('/concerns', { params: filters });
    return response.data;
  },

  getMyConcerns: async (reporterId: string): Promise<Concern[]> => {
    const response = await apiClient.get('/concerns/my-concerns', {
      params: { reporterId },
    });
    return response.data;
  },

  getOne: async (id: string): Promise<Concern> => {
    const response = await apiClient.get(`/concerns/${id}`);
    return response.data;
  },

  create: async (
    reporterId: string,
    reportedId: string,
    type: ConcernType,
    description: string,
    severity?: ConcernSeverity,
    photoPath?: string
  ): Promise<Concern> => {
    const response = await apiClient.post(
      '/concerns',
      { reportedId, type, description, severity, photoPath },
      { params: { reporterId } }
    );
    return response.data;
  },

  update: async (
    id: string,
    resolvedBy: string,
    data: { status?: ConcernStatus; notes?: string }
  ): Promise<Concern> => {
    const response = await apiClient.patch(
      `/concerns/${id}`,
      data,
      { params: { resolvedBy } }
    );
    return response.data;
  },

  getStats: async (unitId: string): Promise<{
    pending: number;
    underReview: number;
    resolved: number;
    dismissed: number;
    active: number;
  }> => {
    const response = await apiClient.get('/concerns/stats', {
      params: { unitId },
    });
    return response.data;
  },

  getReportableTenants: async (
    tenantId: string
  ): Promise<{ id: string; roomNumber: string }[]> => {
    const response = await apiClient.get('/concerns/reportable-tenants', {
      params: { tenantId },
    });
    return response.data;
  },
};
