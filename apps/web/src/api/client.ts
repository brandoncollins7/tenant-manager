import axios from 'axios';
import { trackEvent } from '../utils/analytics';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors and track network errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Track network errors
    trackEvent('error:network', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      error_code: error.code,
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
