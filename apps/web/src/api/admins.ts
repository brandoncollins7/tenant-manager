import axios from 'axios';
import type { Admin, AdminRole } from '../types';

interface CreateAdminRequest {
  email: string;
  name: string;
  role: AdminRole;
  unitIds?: string[];
}

interface UpdateAdminRequest {
  email?: string;
  name?: string;
  role?: AdminRole;
  unitIds?: string[];
}

export const adminsApi = {
  getAll: async (): Promise<Admin[]> => {
    const { data } = await axios.get('/api/admins');
    return data;
  },

  create: async (adminData: CreateAdminRequest): Promise<Admin> => {
    const { data } = await axios.post('/api/admins', adminData);
    return data;
  },

  update: async (id: string, adminData: UpdateAdminRequest): Promise<Admin> => {
    const { data } = await axios.patch(`/api/admins/${id}`, adminData);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/admins/${id}`);
  },
};
