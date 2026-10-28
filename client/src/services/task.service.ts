import api from './api';
import {
  Task,
  TaskFilters,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskStatus,
  Pagination,
  TaskProof,
} from '../types';

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

  /**
   * FEATURE 1: Submit a photo for AI completion verification
   */
  async submitCompletion(
    taskId: string,
    photoFile: File,
    notes?: string,
    onProgress?: (percent: number) => void
  ): Promise<{
    verified: boolean;
    status: 'VERIFIED' | 'REJECTED';
    feedback: string;
    confidence: number;
    relevanceScore?: number;
    task: Task;
    proof: TaskProof;
  }> {
    const formData = new FormData();
    formData.append('photo', photoFile, photoFile.name || 'proof.jpg');
    if (notes) formData.append('notes', notes);

    const { data } = await api.post(`/tasks/${taskId}/submit-completion`, formData, {
      headers: {
        'Content-Type': undefined,
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return data.data;
  },

  /**
   * Get past photo verification proof attempts for a task
   */
  async getProofs(taskId: string): Promise<TaskProof[]> {
    const { data } = await api.get(`/tasks/${taskId}/proofs`);
    return data.data.proofs;
  },
};
