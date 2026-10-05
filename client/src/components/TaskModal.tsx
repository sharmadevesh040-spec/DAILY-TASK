import { useState, useEffect, FormEvent } from 'react';
import { X, Calendar, Clock, Tag, Flag, RefreshCw, Bell, Loader2 } from 'lucide-react';
import { Task, Priority, RecurrenceType, CreateTaskPayload } from '../types';
import { taskService } from '../services/task.service';
import { categoryService } from '../services/category.service';
import { Category } from '../types';
import { useToastContext } from '../context/ToastContext';
import { toLocalDateString } from '../utils';

interface Props {
  task?: Task;
  initialDate?: string;
  onClose: () => void;
  onSuccess: (task: Task) => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'LOW',    label: 'Low'    },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH',   label: 'High'   },
  { value: 'URGENT', label: 'Urgent' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceType | 'NONE'; label: string }[] = [
  { value: 'NONE',     label: 'None'            },
  { value: 'DAILY',    label: 'Daily'           },
  { value: 'WEEKDAYS', label: 'Weekdays (Mon–Fri)' },
  { value: 'WEEKLY',   label: 'Weekly'          },
  { value: 'MONTHLY',  label: 'Monthly'         },
  { value: 'CUSTOM',   label: 'Custom'          },
];

const REMINDER_OPTIONS = [
  { value: 0,    label: 'No reminder'       },
  { value: 10,   label: '10 minutes before' },
  { value: 30,   label: '30 minutes before' },
  { value: 60,   label: '1 hour before'     },
  { value: 120,  label: '2 hours before'    },
  { value: 1440, label: '1 day before'      },
];

export default function TaskModal({ task, initialDate, onClose, onSuccess }: Props) {
  const { toast } = useToastContext();
  const [categories, setCategories]     = useState<Category[]>([]);
  const [loading, setLoading]           = useState(false);

  const [title,              setTitle]              = useState(task?.title        || '');
  const [description,        setDescription]        = useState(task?.description  || '');
  const [priority,           setPriority]           = useState<Priority>(task?.priority || 'MEDIUM');
  const [categoryId,         setCategoryId]         = useState(task?.categoryId   || '');
  const [dueDate,            setDueDate]            = useState(
    task?.dueDate
      ? toLocalDateString(new Date(task.dueDate))
      : initialDate || toLocalDateString(new Date())
  );
  const [dueTime,            setDueTime]            = useState(task?.dueTime || '');
  const [recurrence,         setRecurrence]         = useState<RecurrenceType | 'NONE'>(
    task?.recurringTask?.recurrenceType || 'NONE'
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState(
    task?.recurringTask?.recurrenceInterval || 1
  );
  const [recurrenceEndDate,  setRecurrenceEndDate]  = useState(
    task?.recurringTask?.endDate
      ? toLocalDateString(new Date(task.recurringTask.endDate))
      : ''
  );
  const [reminderMinutes,    setReminderMinutes]    = useState(0);
  const [errors,             setErrors]             = useState<Record<string, string>>({});

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => {});
    if (task?.reminders?.length) {
      const r = task.reminders[0];
      if (task.dueDate && r.reminderTime) {
        const due  = new Date(task.dueDate);
        const rem  = new Date(r.reminderTime);
        const diff = Math.round((due.getTime() - rem.getTime()) / 60000);
        const match = REMINDER_OPTIONS.find((o) => o.value === diff);
        if (match) setReminderMinutes(match.value);
      }
    }
  }, [task]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: CreateTaskPayload = {
        title:       title.trim(),
        description: description.trim() || undefined,
        priority,
        categoryId:  categoryId || undefined,
        dueDate:     dueDate    || undefined,
        dueTime:     dueTime    || undefined,
        recurrence:
          recurrence !== 'NONE'
            ? { type: recurrence, interval: recurrenceInterval, endDate: recurrenceEndDate || undefined }
            : undefined,
        reminderMinutes: reminderMinutes > 0 ? reminderMinutes : undefined,
      };

      const result = task
        ? await taskService.updateTask(task.id, payload)
        : await taskService.createTask(payload);

      toast(task ? 'Task updated successfully' : 'Task created successfully', 'success');
      onSuccess(result);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Something went wrong';
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Full-viewport overlay */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/*
        Modal panel
        • Mobile  : slides up from bottom, full width, rounded top corners, max 95vh
        • Tablet+ : centered card, max-w-lg, rounded all corners
      */}
      <div
        className={[
          'relative z-10 bg-white flex flex-col',
          'w-full max-w-lg',
          /* mobile: bottom sheet */
          'rounded-t-2xl sm:rounded-2xl',
          /* height constraints so it's scrollable inside but never overflows */
          'max-h-[95svh] sm:max-h-[90vh]',
          /* entrance animation */
          'animate-slide-up',
          /* safe-area on notched phones */
          'pb-safe',
        ].join(' ')}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
          {/* Bottom-sheet drag handle (mobile visual cue) */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-200 rounded-full sm:hidden" />

          <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-gray-900">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-lg
                       text-gray-400 hover:text-gray-600 hover:bg-gray-100
                       transition-colors touch-manipulation"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable form body ──────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">

            {/* Title */}
            <div>
              <label className="label" htmlFor="task-title">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="task-title"
                type="text"
                className={`input-field ${errors.title ? 'border-red-400 focus:ring-red-400' : ''}`}
                placeholder="What do you need to do?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="label" htmlFor="task-desc">Description</label>
              <textarea
                id="task-desc"
                className="input-field resize-none"
                rows={3}
                placeholder="Add more details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Priority + Category — stacked on mobile, side-by-side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label flex items-center gap-1" htmlFor="task-priority">
                  <Flag className="w-3.5 h-3.5 shrink-0" /> Priority
                </label>
                <select
                  id="task-priority"
                  className="input-field"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label flex items-center gap-1" htmlFor="task-category">
                  <Tag className="w-3.5 h-3.5 shrink-0" /> Category
                </label>
                <select
                  id="task-category"
                  className="input-field"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date + Time — stacked on mobile, side-by-side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label flex items-center gap-1" htmlFor="task-date">
                  <Calendar className="w-3.5 h-3.5 shrink-0" /> Due Date
                </label>
                <input
                  id="task-date"
                  type="date"
                  className="input-field"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label flex items-center gap-1" htmlFor="task-time">
                  <Clock className="w-3.5 h-3.5 shrink-0" /> Due Time
                </label>
                <input
                  id="task-time"
                  type="time"
                  className="input-field"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                />
              </div>
            </div>

            {/* Reminder */}
            <div>
              <label className="label flex items-center gap-1" htmlFor="task-reminder">
                <Bell className="w-3.5 h-3.5 shrink-0" /> Reminder
              </label>
              <select
                id="task-reminder"
                className="input-field"
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
              >
                {REMINDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Recurrence */}
            <div>
              <label className="label flex items-center gap-1" htmlFor="task-recurrence">
                <RefreshCw className="w-3.5 h-3.5 shrink-0" /> Repeat
              </label>
              <select
                id="task-recurrence"
                className="input-field"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType | 'NONE')}
              >
                {RECURRENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {recurrence === 'CUSTOM' && (
                <div className="mt-3">
                  <label className="label" htmlFor="task-interval">Every (days)</label>
                  <input
                    id="task-interval"
                    type="number"
                    min={1}
                    max={365}
                    className="input-field"
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                  />
                </div>
              )}

              {recurrence !== 'NONE' && (
                <div className="mt-3">
                  <label className="label" htmlFor="task-end-date">End Date (optional)</label>
                  <input
                    id="task-end-date"
                    type="date"
                    className="input-field"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────────────── */}
          <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50
                          rounded-b-2xl flex flex-col-reverse sm:flex-row items-stretch sm:items-center
                          justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto"
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
