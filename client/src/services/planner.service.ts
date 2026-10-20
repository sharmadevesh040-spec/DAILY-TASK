import api from './api';
import { GeneratedPlan, GeneratedTask, ReschedulePlan, Task } from '../types';

export const plannerService = {
  /**
   * FEATURE 2: Generate smart plan from natural language prompt
   */
  async generatePlan(params: {
    prompt: string;
    availableHoursPerDay?: number;
    preferredTimeOfDay?: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'FLEXIBLE';
    startDate?: string;
  }): Promise<GeneratedPlan> {
    const { data } = await api.post('/planner/generate', params);
    return data.data.plan;
  },

  /**
   * FEATURE 2: Apply approved tasks to database
   */
  async applyPlan(tasks: GeneratedTask[]): Promise<{
    createdCount: number;
    skippedCount: number;
    tasks: Task[];
  }> {
    const { data } = await api.post('/planner/apply', { tasks });
    return data.data;
  },

  /**
   * FEATURE 2: Get rescheduling suggestions for overdue/missed tasks
   */
  async getRescheduleSuggestions(params?: {
    availableHoursPerDay?: number;
    preferences?: string;
  }): Promise<{
    suggestions: ReschedulePlan;
    count: number;
  }> {
    const { data } = await api.post('/planner/reschedule-suggestions', params || {});
    return data.data;
  },

  /**
   * FEATURE 2: Apply reschedule changes
   */
  async applyReschedule(
    reschedules: {
      taskId: string;
      suggestedDueDate: string;
      suggestedDueTime?: string | null;
    }[]
  ): Promise<{
    count: number;
    tasks: Task[];
  }> {
    const { data } = await api.post('/planner/apply-reschedule', { reschedules });
    return data.data;
  },

  /**
   * Automatic AI Schedule: Join Priority Waitlist
   */
  async joinWaitlist(): Promise<{ enrolled: boolean; message: string }> {
    const { data } = await api.post('/planner/waitlist');
    return { enrolled: true, message: data.message };
  },
};
