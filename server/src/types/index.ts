import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface CreateTaskBody {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  categoryId?: string;
  dueDate?: string;
  dueTime?: string;
  recurrence?: {
    type: 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
    interval?: number;
    endDate?: string;
  };
  reminderMinutes?: number;
}

export interface UpdateTaskBody extends Partial<CreateTaskBody> {
  status?: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  categoryId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
