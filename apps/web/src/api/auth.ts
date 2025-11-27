import { apiClient } from './client';
import type { User } from '../types';

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export const authApi = {
  requestMagicLink: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/request-link', { email });
    return response.data;
  },

  verifyMagicLink: async (token: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/verify', { token });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};
