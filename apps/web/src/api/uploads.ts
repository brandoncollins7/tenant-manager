import { apiClient } from './client';

export interface UploadResponse {
  filename: string;
  path: string;
}

export const uploadsApi = {
  uploadPhoto: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/uploads/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
