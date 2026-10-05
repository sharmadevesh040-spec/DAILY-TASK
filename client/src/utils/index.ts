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
    COMPLETED: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
  };
  return map[status];
}

export function getStatusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
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
