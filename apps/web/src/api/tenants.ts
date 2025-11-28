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

  downloadLeaseVersion: (tenantId: string, version: number) => {
    return `/api/tenants/${tenantId}/leases/${version}`;
  },

  downloadCurrentLease: (tenantId: string) => {
    return `/api/tenants/${tenantId}/lease`;
  },
};
