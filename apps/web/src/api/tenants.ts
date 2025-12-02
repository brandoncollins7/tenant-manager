import { apiClient } from './client';
import { LeaseDocument } from '../types';

export const tenantsApi = {
  uploadLease: async (
    tenantId: string,
    file: File,
    notes?: string,
  ): Promise<LeaseDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    if (notes) {
      formData.append('notes', notes);
    }
    const response = await apiClient.post(`/tenants/${tenantId}/lease`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getLeaseHistory: async (tenantId: string): Promise<LeaseDocument[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/leases`);
    return response.data;
  },

  getLeaseVersionBlob: async (tenantId: string, version: number): Promise<Blob> => {
    const response = await apiClient.get(`/tenants/${tenantId}/leases/${version}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  getCurrentLeaseBlob: async (tenantId: string): Promise<Blob> => {
    const response = await apiClient.get(`/tenants/${tenantId}/lease`, {
      responseType: 'blob',
    });
    return response.data;
  },

  sendLoginLink: async (tenantId: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/tenants/${tenantId}/send-login-link`);
    return response.data;
  },

  impersonate: async (tenantId: string): Promise<{ url: string }> => {
    const response = await apiClient.post(`/tenants/${tenantId}/impersonate`);
    return response.data;
  },
};
