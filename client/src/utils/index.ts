import { Priority, TaskStatus } from '../types';

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function isToday(dateStr: string | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

export function isOverdue(dateStr: string | undefined, status: TaskStatus): boolean {
  if (!dateStr || status === 'COMPLETED') return false;
  if (status === 'OVERDUE') return true;
  return new Date(dateStr) < new Date();
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getPriorityColor(priority: Priority): string {
  const map: Record<Priority, string> = {
    LOW: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700',
  };
  return map[priority];
}

export function getPriorityDot(priority: Priority): string {
  const map: Record<Priority, string> = {
    LOW: 'bg-green-500',
    MEDIUM: 'bg-blue-500',
    HIGH: 'bg-orange-500',
    URGENT: 'bg-red-500',
  };
  return map[priority];
}

export function getStatusColor(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    TODO: 'bg-gray-100 text-gray-600',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    PENDING_VERIFICATION: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };
  return map[status];
}

export function getStatusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    PENDING_VERIFICATION: 'Pending Verification',
    COMPLETED: 'Completed',
    OVERDUE: 'Overdue',
  };
  return map[status];
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(text: string, length: number): string {
  return text.length > length ? text.slice(0, length) + '…' : text;
}

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Extracts a clean, human-readable error message from an unknown error (AxiosError, Error, string, or object).
 */
export function extractErrorMessage(err: unknown, fallback = 'An unexpected error occurred. Please try again.'): string {
  if (!err) return fallback;

  if (typeof err === 'string' && err.trim()) return err.trim();

  if (typeof err === 'object') {
    const anyErr = err as {
      response?: {
        status?: number;
        data?: unknown;
      };
      message?: string;
      code?: string;
    };

    // Check Axios response
    if (anyErr.response?.data) {
      const data = anyErr.response.data as Record<string, unknown> | string;

      // Plain string response
      if (typeof data === 'string') {
        const trimmed = data.trim();
        if (trimmed.startsWith('<')) {
          if (anyErr.response.status === 504 || trimmed.includes('504')) {
            return 'Server connection timed out. Please try again.';
          }
          if (anyErr.response.status === 502 || trimmed.includes('502')) {
            return 'Server is temporarily unavailable. Please try again.';
          }
          if (anyErr.response.status === 404) {
            return 'Resource not found. Please try again.';
          }
          return `Server returned status ${anyErr.response.status}. Please try again.`;
        }
        return trimmed;
      }

      // JSON { message: "..." }
      if (typeof data.message === 'string' && data.message.trim()) {
        return data.message.trim();
      }

      // JSON { error: "..." }
      if (typeof data.error === 'string' && data.error.trim()) {
        return data.error.trim();
      }

      // express-validator errors array [{ msg: "..." }]
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        const msgs = data.errors
          .map((e: unknown) => {
            if (typeof e === 'string') return e;
            if (e && typeof e === 'object') {
              const obj = e as { msg?: string; message?: string };
              return obj.msg || obj.message || '';
            }
            return '';
          })
          .filter(Boolean);
        if (msgs.length > 0) return msgs.join(', ');
      }
    }

    // Status code fallbacks when no specific body message was sent
    if (anyErr.response?.status === 404) {
      return 'No account found with this email. Please check your email or create an account.';
    }
    if (anyErr.response?.status === 409) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    if (anyErr.response?.status === 429) {
      return 'Too many requests. Please wait a moment before trying again.';
    }
    if (anyErr.response?.status === 401) {
      return 'Invalid credentials. Please try again.';
    }
    if (anyErr.response?.status && anyErr.response.status >= 500) {
      return 'Email server issue. Please verify your connection or try again later.';
    }

    // Network / timeout / offline errors
    if (anyErr.message === 'Network Error' || anyErr.code === 'ERR_NETWORK') {
      return 'Network connection error. Please check your internet connection and try again.';
    }
    if (anyErr.code === 'ECONNABORTED' || anyErr.message?.toLowerCase().includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }

    if (anyErr.message && typeof anyErr.message === 'string' && anyErr.message !== 'Error') {
      return anyErr.message;
    }
  }

  return fallback;
}
