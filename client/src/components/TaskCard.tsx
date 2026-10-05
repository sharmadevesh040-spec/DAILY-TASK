import { useState } from 'react';
import {
  Check,
  Pencil,
  Trash2,
  Clock,
  Calendar,
  Bell,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Task } from '../types';
import { taskService } from '../services/task.service';
import { useToastContext } from '../context/ToastContext';
import {
  getPriorityColor,
  getPriorityDot,
  formatDateShort,
  formatTime,
  isToday,
  isOverdue,
  cn,
  truncate,
} from '../utils';
import TaskModal from './TaskModal';

interface Props {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({ task, onUpdate, onDelete }: Props) {
  const { toast } = useToastContext();
  const [toggling, setToggling]   = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [showEdit, setShowEdit]   = useState(false);
  const [expanded, setExpanded]   = useState(false);

  const isCompleted = task.status === 'COMPLETED';
  const overdueFlag = isOverdue(task.dueDate, task.status);

  async function handleToggle() {
    setToggling(true);
    try {
      const newStatus = isCompleted ? 'TODO' : 'COMPLETED';
      const updated = await taskService.updateStatus(task.id, newStatus);
      onUpdate(updated);
      toast(isCompleted ? 'Task marked as to-do' : 'Task completed! 🎉', 'success');
    } catch {
      toast('Failed to update task', 'error');
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    setDeleting(true);
    try {
      await taskService.deleteTask(task.id);
      onDelete(task.id);
      toast('Task deleted', 'info');
    } catch {
      toast('Failed to delete task', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          'card p-3 sm:p-4 transition-all duration-200 hover:shadow-md',
          /* keep max-width contained */
          'w-full min-w-0',
          isCompleted && 'opacity-60',
          overdueFlag  && 'border-red-200 bg-red-50/30'
        )}
      >
        <div className="flex items-start gap-3 min-w-0">

          {/* ── Checkbox ─────────────────────────────────────────────────── */}
          {/* 44×44 tap target wrapper around the small visual circle */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
            className={cn(
              /* visual circle */
              'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
              'transition-all duration-200 touch-manipulation',
              /* extend tap area without affecting layout */
              'relative after:absolute after:-inset-2.5',
              isCompleted
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 hover:border-primary-500',
              toggling && 'opacity-50 cursor-wait'
            )}
          >
            {isCompleted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </button>

          {/* ── Content ──────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Title row — title + action buttons */}
            <div className="flex items-start justify-between gap-2 min-w-0">
              {/* Tapping the title toggles the description */}
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex-1 text-left min-w-0 touch-manipulation"
                aria-expanded={expanded}
              >
                <h3
                  className={cn(
                    'text-sm font-medium leading-snug break-words',
                    isCompleted
                      ? 'line-through text-gray-400'
                      : 'text-gray-900'
                  )}
                >
                  {task.title}
                </h3>
              </button>

              {/* ── Action buttons ─────────────────────────────────────── */}
              {/* On mobile: always visible. On desktop: fade in on hover via group */}
              <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity">
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7
                             rounded-md text-gray-400
                             hover:text-primary-600 hover:bg-primary-50
                             active:bg-primary-100
                             transition-colors touch-manipulation"
                  aria-label="Edit task"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7
                             rounded-md text-gray-400
                             hover:text-red-600 hover:bg-red-50
                             active:bg-red-100
                             transition-colors touch-manipulation
                             disabled:opacity-40 disabled:cursor-wait"
                  aria-label="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <p className="mt-1 text-xs text-gray-500 leading-relaxed break-words">
                {expanded ? task.description : truncate(task.description, 100)}
              </p>
            )}

            {/* ── Metadata chips ─────────────────────────────────────────── */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">

              {/* Priority */}
              <span className={`badge ${getPriorityColor(task.priority)}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1 shrink-0 ${getPriorityDot(task.priority)}`} />
                {task.priority}
              </span>

              {/* Category */}
              {task.category && (
                <span
                  className="badge text-white text-xs max-w-[120px] truncate"
                  style={{ backgroundColor: task.category.color }}
                  title={task.category.name}
                >
                  {task.category.name}
                </span>
              )}

              {/* Due date / time */}
              {task.dueDate && (
                <span
                  className={cn(
                    'flex items-center gap-1 text-xs shrink-0',
                    overdueFlag
                      ? 'text-red-500 font-medium'
                      : isToday(task.dueDate)
                        ? 'text-primary-600'
                        : 'text-gray-500'
                  )}
                >
                  {overdueFlag
                    ? <AlertCircle className="w-3 h-3 shrink-0" />
                    : <Calendar    className="w-3 h-3 shrink-0" />}
                  {isToday(task.dueDate) ? 'Today' : formatDateShort(task.dueDate)}
                  {task.dueTime && (
                    <>
                      <Clock className="w-3 h-3 shrink-0 ml-0.5" />
                      {formatTime(task.dueTime)}
                    </>
                  )}
                </span>
              )}

              {/* Reminder indicator */}
              {(task.reminders?.length ?? 0) > 0 && (
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  <Bell className="w-3 h-3 shrink-0" />
                </span>
              )}

              {/* Recurring indicator */}
              {task.recurringTask && (
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  <RefreshCw className="w-3 h-3 shrink-0" />
                  <span className="hidden xs:inline">
                    {task.recurringTask.recurrenceType.toLowerCase()}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <TaskModal
          task={task}
          onClose={() => setShowEdit(false)}
          onSuccess={(updated) => {
            setShowEdit(false);
            onUpdate(updated);
          }}
        />
      )}
    </>
  );
}
