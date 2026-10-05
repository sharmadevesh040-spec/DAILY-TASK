import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Task } from '../types';
import { dashboardService } from '../services/dashboard.service';
import { useToastContext } from '../context/ToastContext';
import TaskModal from '../components/TaskModal';
import TaskCard from '../components/TaskCard';
import { cn, toLocalDateString } from '../utils';
import { taskService } from '../services/task.service';

type ViewType = 'month' | 'week' | 'day';

const DAYS_FULL  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_SHORT = ['S',   'M',   'T',   'W',   'T',   'F',   'S'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function startOfWeek(date: Date): Date {
  const d   = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function CalendarPage() {
  const { toast } = useToastContext();
  const today     = new Date();

  const [view,          setView]          = useState<ViewType>('month');
  const [currentDate,   setCurrentDate]   = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate,  setSelectedDate]  = useState<string>(toLocalDateString(today));
  const [tasks,         setTasks]         = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [showModal,     setShowModal]     = useState(false);
  /* on mobile: toggle the day-tasks panel */
  const [showDayPanel,  setShowDayPanel]  = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'month') {
        const t = await dashboardService.getCalendarTasks(
          currentDate.getFullYear(), currentDate.getMonth() + 1
        );
        setTasks(t);
      } else if (view === 'week') {
        const ws = startOfWeek(currentDate);
        const we = new Date(ws);
        we.setDate(we.getDate() + 6);
        const r = await taskService.getTasks({
          dateFrom: toLocalDateString(ws), dateTo: toLocalDateString(we),
          sortBy: 'dueDate', sortOrder: 'asc',
        });
        setTasks(r.tasks);
      } else {
        const r = await taskService.getTasks({
          dateFrom: selectedDate, dateTo: selectedDate,
          sortBy: 'dueDate', sortOrder: 'asc',
        });
        setTasks(r.tasks);
      }
    } catch {
      toast('Failed to load calendar tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentDate, view, selectedDate, toast]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    const dayTasks = tasks.filter(
      (t) => t.dueDate && toLocalDateString(new Date(t.dueDate)) === selectedDate
    );
    setSelectedTasks(dayTasks);
  }, [tasks, selectedDate]);

  function getTasksForDate(dateStr: string) {
    return tasks.filter((t) => t.dueDate && toLocalDateString(new Date(t.dueDate)) === dateStr);
  }

  function buildMonthGrid(): Date[] {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const grid: Date[] = [];
    for (let i = 0; i < first.getDay(); i++) grid.push(new Date(year, month, -i));
    grid.reverse();
    for (let d = 1; d <= last.getDate(); d++) grid.push(new Date(year, month, d));
    const remaining = 42 - grid.length;
    for (let i = 1; i <= remaining; i++) grid.push(new Date(year, month + 1, i));
    return grid;
  }

  function buildWeekDays(): Date[] {
    const ws = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  function navigate(dir: 1 | -1) {
    const d = new Date(currentDate);
    if (view === 'month')      d.setMonth(d.getMonth() + dir);
    else if (view === 'week')  d.setDate(d.getDate() + dir * 7);
    else                       d.setDate(d.getDate() + dir);
    setCurrentDate(d);
    if (view !== 'month') setSelectedDate(toLocalDateString(d));
  }

  function getTitle() {
    if (view === 'month') return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === 'week') {
      const ws = startOfWeek(currentDate);
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr);
    setShowDayPanel(true);
  }

  function handleTaskUpdate(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }
  function handleTaskDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const monthGrid = view === 'month' ? buildMonthGrid() : [];
  const weekDays  = view === 'week'  ? buildWeekDays()  : [];

  return (
    <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4 animate-fade-in w-full min-w-0">

      {/* ── Controls bar ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">

        {/* Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors touch-manipulation shrink-0"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>

          <h2 className="text-sm sm:text-base font-semibold text-gray-900 text-center flex-1 truncate px-1">
            {getTitle()}
          </h2>

          <button
            onClick={() => navigate(1)}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors touch-manipulation shrink-0"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>

          <button
            onClick={() => {
              setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
              setSelectedDate(toLocalDateString(today));
            }}
            className="px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shrink-0 touch-manipulation"
          >
            Today
          </button>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
          {(['month', 'week', 'day'] as ViewType[]).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); if (v === 'day') setCurrentDate(new Date(selectedDate)); }}
              className={cn(
                'px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-md font-medium capitalize transition-colors touch-manipulation',
                view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar + Day panel ───────────────────────────────────────── */}
      {/*
        Layout:
        • Mobile:  calendar full-width, day panel slides up as an overlay sheet
        • Desktop: calendar 2/3 + day panel 1/3 side by side
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">

        {/* Calendar grid */}
        <div className="lg:col-span-2 card overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <div className="animate-spin w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full" />
            </div>
          )}

          {/* ── Month view ─────────────────────────────────────────────── */}
          {view === 'month' && (
            <>
              {/* Day-of-week headers — abbreviated on mobile */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {DAYS_FULL.map((d, i) => (
                  <div key={d} className="py-1.5 text-center">
                    <span className="hidden sm:inline text-xs font-medium text-gray-500 uppercase tracking-wide">{d}</span>
                    <span className="sm:hidden text-xs font-medium text-gray-500 uppercase">{DAYS_SHORT[i]}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {monthGrid.map((date, i) => {
                  const dateStr        = toLocalDateString(date);
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const isSelected     = dateStr === selectedDate;
                  const isTodayDate    = dateStr === toLocalDateString(today);
                  const dayTasks       = getTasksForDate(dateStr);

                  return (
                    <button
                      key={i}
                      onClick={() => handleDateSelect(dateStr)}
                      className={cn(
                        /* Mobile: smaller min-height */
                        'min-h-[52px] sm:min-h-[72px] lg:min-h-[80px]',
                        'p-1 sm:p-1.5 border-b border-r border-gray-50 text-left',
                        'transition-colors hover:bg-gray-50 touch-manipulation',
                        !isCurrentMonth && 'opacity-30',
                        isSelected && 'bg-primary-50',
                      )}
                    >
                      <span className={cn(
                        'inline-flex w-5 h-5 sm:w-6 sm:h-6 items-center justify-center rounded-full',
                        'text-[11px] sm:text-xs font-medium',
                        isTodayDate                  && 'bg-primary-600 text-white',
                        isSelected && !isTodayDate   && 'bg-primary-100 text-primary-700',
                        !isTodayDate && !isSelected  && 'text-gray-700'
                      )}>
                        {date.getDate()}
                      </span>

                      {/* Task pills — hidden on very small screens to avoid overflow */}
                      <div className="mt-0.5 space-y-0.5 hidden sm:block">
                        {dayTasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            className="text-[10px] truncate px-1 py-0.5 rounded leading-tight"
                            style={{
                              backgroundColor: t.category?.color ? `${t.category.color}20` : '#6366f120',
                              color: t.category?.color || '#6366f1',
                            }}
                          >
                            {t.title}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <p className="text-[10px] text-gray-400 pl-1">+{dayTasks.length - 2}</p>
                        )}
                      </div>

                      {/* Mobile: just a dot indicator */}
                      {dayTasks.length > 0 && (
                        <div className="sm:hidden mt-0.5 flex gap-0.5 flex-wrap">
                          {dayTasks.slice(0, 3).map((t) => (
                            <span
                              key={t.id}
                              className="w-1 h-1 rounded-full shrink-0"
                              style={{ backgroundColor: t.category?.color || '#6366f1' }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Week view ──────────────────────────────────────────────── */}
          {view === 'week' && (
            <>
              <div className="grid grid-cols-7 border-b border-gray-100">
                {weekDays.map((d) => {
                  const dateStr    = toLocalDateString(d);
                  const isSelected = dateStr === selectedDate;
                  const isTodayD   = dateStr === toLocalDateString(today);
                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDateSelect(dateStr)}
                      className={cn('p-1.5 sm:p-3 text-center transition-colors hover:bg-gray-50 touch-manipulation', isSelected && 'bg-primary-50')}
                    >
                      <p className="text-[10px] sm:text-xs text-gray-500 uppercase">{DAYS_SHORT[d.getDay()]}</p>
                      <span className={cn(
                        'inline-flex w-6 h-6 sm:w-8 sm:h-8 items-center justify-center rounded-full text-xs sm:text-sm font-semibold mt-0.5',
                        isTodayD                 && 'bg-primary-600 text-white',
                        isSelected && !isTodayD  && 'bg-primary-100 text-primary-700',
                        !isTodayD && !isSelected && 'text-gray-800'
                      )}>
                        {d.getDate()}
                      </span>
                      {getTasksForDate(dateStr).length > 0 && (
                        <div className="w-1 h-1 bg-primary-500 rounded-full mx-auto mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-7 min-h-[120px] sm:min-h-[180px] divide-x divide-gray-100">
                {weekDays.map((d) => {
                  const dateStr  = toLocalDateString(d);
                  const dayTasks = getTasksForDate(dateStr);
                  const isSelected = dateStr === selectedDate;
                  return (
                    <div
                      key={dateStr}
                      onClick={() => handleDateSelect(dateStr)}
                      className={cn('p-1 cursor-pointer hover:bg-gray-50 transition-colors', isSelected && 'bg-primary-50/50')}
                    >
                      {dayTasks.map((t) => (
                        <div
                          key={t.id}
                          className="text-[10px] p-0.5 rounded mb-0.5 truncate leading-tight"
                          style={{
                            backgroundColor: t.category?.color ? `${t.category.color}20` : '#6366f120',
                            color: t.category?.color || '#6366f1',
                          }}
                        >
                          {t.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── Day view ───────────────────────────────────────────────── */}
          {view === 'day' && (
            <div className="p-3 sm:p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric',
                })}
              </p>
              {getTasksForDate(selectedDate).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No tasks this day</p>
              ) : (
                <div className="space-y-2">
                  {getTasksForDate(selectedDate).map((t) => (
                    <TaskCard key={t.id} task={t} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Day panel ─────────────────────────────────────────────────
            Desktop: always visible in the 3rd column
            Mobile:  slides up as a sheet when a date is tapped
        ────────────────────────────────────────────────────────────────── */}

        {/* Mobile sheet backdrop */}
        {showDayPanel && (
          <div
            className="lg:hidden fixed inset-0 bg-black/30 z-30"
            onClick={() => setShowDayPanel(false)}
          />
        )}

        <div className={cn(
          /* Desktop: normal grid column */
          'lg:block lg:static lg:z-auto lg:bg-transparent lg:p-0',
          /* Mobile: fixed bottom sheet */
          'fixed bottom-0 inset-x-0 z-40',
          'lg:relative lg:inset-auto',
          'bg-white lg:bg-transparent rounded-t-2xl lg:rounded-none shadow-2xl lg:shadow-none',
          'transition-transform duration-300 ease-out',
          showDayPanel ? 'translate-y-0' : 'translate-y-full lg:translate-y-0',
          /* max height on mobile */
          'max-h-[60vh] lg:max-h-none overflow-y-auto',
        )}>
          {/* Mobile drag handle */}
          <div className="lg:hidden flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="p-3 sm:p-0 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'short', day: 'numeric',
                })}
              </h3>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors touch-manipulation"
                aria-label="Add task"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {selectedTasks.length === 0 ? (
              <div className="card p-5 text-center">
                <p className="text-gray-400 text-sm">No tasks</p>
                <button onClick={() => setShowModal(true)} className="mt-2 text-sm text-primary-600 hover:underline touch-manipulation">
                  Add one
                </button>
              </div>
            ) : (
              <div className="space-y-2 pb-4 lg:pb-0">
                {selectedTasks.map((t) => (
                  <TaskCard key={t.id} task={t} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <TaskModal
          initialDate={selectedDate}
          onClose={() => setShowModal(false)}
          onSuccess={(t) => { setShowModal(false); setTasks((prev) => [...prev, t]); }}
        />
      )}
    </div>
  );
}
