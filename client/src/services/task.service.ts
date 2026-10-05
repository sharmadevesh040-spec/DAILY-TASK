import api from './api';
import { Task, TaskFilters, CreateTaskPayload, UpdateTaskPayload, TaskStatus, Pagination } from '../types';

export const taskService = {
  async getTasks(filters?: TaskFilters): Promise<{ tasks: Task[]; pagination: Pagination }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== '' && val !== 'ALL') {
          params.set(key, String(val));
        }
      });
    }
    const { data } = await api.get(`/tasks?${params.toString()}`);
    return data.data;
  },

  async getTask(id: string): Promise<Task> {
    const { data } = await api.get(`/tasks/${id}`);
    return data.data.task;
  },

  async getTodayTasks(): Promise<Task[]> {
    const { data } = await api.get('/tasks/today');
    return data.data.tasks;
  },

  async createTask(payload: CreateTaskPayload): Promise<Task> {
    const { data } = await api.post('/tasks', payload);
    return data.data.task;
  },

  async updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
    const { data } = await api.put(`/tasks/${id}`, payload);
    return data.data.task;
  },

  async deleteTask(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const { data } = await api.patch(`/tasks/${id}/status`, { status });
    return data.data.task;
  },
};
