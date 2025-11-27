import { apiClient } from './client';
import type { ChoreDefinition, ChoreSchedule, ChoreCompletion } from '../types';

export interface TodaysChores {
  isChoreDay: boolean;
  occupant: { id: string; name: string; choreDay: number } | null;
  chores: ChoreCompletion[];
}

export const choresApi = {
  getDefinitions: async (unitId: string): Promise<ChoreDefinition[]> => {
    const response = await apiClient.get('/chores', { params: { unitId } });
    return response.data;
  },

  getCurrentSchedule: async (unitId: string): Promise<ChoreSchedule> => {
    const response = await apiClient.get('/chores/schedule', {
      params: { unitId },
    });
    return response.data;
  },

  getScheduleByWeek: async (weekId: string): Promise<ChoreSchedule> => {
    const response = await apiClient.get(`/chores/schedule/${weekId}`);
    return response.data;
  },

  getTodaysChores: async (): Promise<TodaysChores> => {
    const response = await apiClient.get('/chores/today');
    return response.data;
  },

  markComplete: async (
    completionId: string,
    photoPath: string,
    notes?: string
  ): Promise<ChoreCompletion> => {
    const response = await apiClient.post(`/chores/${completionId}/complete`, {
      photoPath,
      notes,
    });
    return response.data;
  },

  getHistory: async (
    occupantId: string,
    limit?: number
  ): Promise<ChoreCompletion[]> => {
    const response = await apiClient.get('/chores/history', {
      params: { occupantId, limit },
    });
    return response.data;
  },
};
