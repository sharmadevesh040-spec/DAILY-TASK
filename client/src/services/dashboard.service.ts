import api from './api';
import { DashboardData } from '../types';

export const dashboardService = {
  async getStats(): Promise<DashboardData> {
    const { data } = await api.get('/dashboard/stats');
    return data.data;
  },

  async getStreak(): Promise<number> {
    const { data } = await api.get('/dashboard/streak');
    return data.data.streak;
  },

  async getCalendarTasks(year: number, month: number) {
    const { data } = await api.get(`/dashboard/calendar?year=${year}&month=${month}`);
    return data.data.tasks;
  },
};
