import { apiClient } from './client';
import type {
  Request,
  CombinedRequestItem,
  CombinedStats,
  ReportableTenant,
  RequestCategory,
} from '../types';

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

  // Combined endpoints
  getCombined: async (tenantId: string): Promise<CombinedRequestItem[]> => {
    const response = await apiClient.get('/requests/combined', {
      params: { tenantId },
    });
    return response.data;
  },

  getAdminCombined: async (filters?: {
    unitId?: string;
    status?: string;
    category?: RequestCategory;
  }): Promise<CombinedRequestItem[]> => {
    const response = await apiClient.get('/requests/admin/combined', {
      params: filters,
    });
    return response.data;
  },

  getCombinedStats: async (unitId: string): Promise<CombinedStats> => {
    const response = await apiClient.get('/requests/combined/stats', {
      params: { unitId },
    });
    return response.data;
  },

  getReportableTenants: async (tenantId: string): Promise<ReportableTenant[]> => {
    const response = await apiClient.get('/requests/reportable-tenants', {
      params: { tenantId },
    });
    return response.data;
  },
};
