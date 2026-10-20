export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'PENDING_VERIFICATION';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type RecurrenceType = 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
  _count?: { tasks: number };
}

export interface Reminder {
  id: string;
  taskId: string;
  reminderTime: string;
  isSent: boolean;
  createdAt: string;
}

export interface RecurringTask {
  id: string;
  taskId: string;
  recurrenceType: RecurrenceType;
  recurrenceInterval: number;
  endDate?: string;
  createdAt: string;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  details?: string;
  createdAt: string;
}

export interface TaskProof {
  id: string;
  taskId: string;
  userId: string;
  imageUrl: string;
  imageKey?: string;
  notes?: string;
  status: VerificationStatus;
  aiScore?: number;
  aiFeedback?: string;
  aiDetails?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  dueTime?: string;
  categoryId?: string;
  completedAt?: string;
  verificationStatus?: VerificationStatus;
  proofPhotoUrl?: string;
  proofPhotoKey?: string;
  verificationFeedback?: string;
  estimatedDuration?: number;
  parentTaskId?: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  reminders?: Reminder[];
  recurringTask?: RecurringTask;
  taskHistory?: TaskHistory[];
  taskProofs?: TaskProof[];
  subtasks?: Task[];
}

export interface DashboardStats {
  todayTotal: number;
  todayCompleted: number;
  todayPending: number;
  overdue: number;
  completionRate: number;
}

export interface DailyStatEntry {
  date: string;
  completed: number;
}

export interface DashboardData {
  stats: DashboardStats;
  todayTasks: Task[];
  overdueTasks: Task[];
  upcomingTasks: Task[];
  dailyStats: DailyStatEntry[];
}

export interface TaskFilters {
  status?: TaskStatus | 'ALL';
  priority?: Priority | 'ALL';
  categoryId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: Priority;
  categoryId?: string;
  dueDate?: string;
  dueTime?: string;
  estimatedDuration?: number;
  parentTaskId?: string;
  recurrence?: {
    type: RecurrenceType;
    interval?: number;
    endDate?: string;
  };
  reminderMinutes?: number;
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {
  status?: TaskStatus;
}

// ── Notification Types ───────────────────────────────────────────────────────
export type NotificationType =
  | 'VERIFICATION_SUCCESS'
  | 'VERIFICATION_REJECTED'
  | 'TASK_DEADLINE'
  | 'TASK_OVERDUE'
  | 'PLANNER_REMINDER'
  | 'SYSTEM';

export interface NotificationItem {
  id: string;
  userId: string;
  taskId?: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  metadata?: string;
  createdAt: string;
}

// ── AI Smart Planner Types ───────────────────────────────────────────────────
export interface GeneratedSubtask {
  title: string;
  description?: string;
  priority?: Priority;
  estimatedDuration?: number;
}

export interface GeneratedTask {
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  dueTime?: string;
  estimatedDuration?: number;
  categoryName?: string;
  subtasks?: GeneratedSubtask[];
}

export interface GeneratedPlan {
  summary: string;
  suggestedSchedule: string;
  tasks: GeneratedTask[];
}

export interface RescheduleSuggestion {
  taskId: string;
  taskTitle: string;
  currentDueDate?: string | null;
  suggestedDueDate: string;
  suggestedDueTime?: string | null;
  reason: string;
}

export interface ReschedulePlan {
  summary: string;
  suggestions: RescheduleSuggestion[];
}
