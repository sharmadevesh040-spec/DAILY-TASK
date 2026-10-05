import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Flame,
  Plus,
  ArrowRight,
  BarChart2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboard.service';
import { DashboardData, Task } from '../types';
import { getGreeting, formatDateShort } from '../utils';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import { useToastContext } from '../context/ToastContext';

export default function DashboardPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const { toast }   = useToastContext();

  const [data,          setData]          = useState<DashboardData | null>(null);
  const [streak,        setStreak]        = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsData, streakData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getStreak(),
      ]);
      setData(statsData);
      setStreak(streakData);
    } catch {
      toast('Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('task-created', handler);
    return () => window.removeEventListener('task-created', handler);
  }, [load]);

  function handleTaskUpdate(updated: Task) {
    setData((prev) => {
      if (!prev) return prev;
      const up = (list: Task[]) => list.map((t) => (t.id === updated.id ? updated : t));
      return { ...prev, todayTasks: up(prev.todayTasks), overdueTasks: up(prev.overdueTasks) };
    });
    load();
  }

  function handleTaskDelete(id: string) {
    setData((prev) => {
      if (!prev) return prev;
      const rm = (list: Task[]) => list.filter((t) => t.id !== id);
      return { ...prev, todayTasks: rm(prev.todayTasks), overdueTasks: rm(prev.overdueTasks) };
    });
    load();
  }

  const today   = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = data?.stats;
  const pct   = stats?.completionRate ?? 0;

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6 max-w-5xl mx-auto animate-fade-in w-full min-w-0">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0">
          {/* Scale heading down on mobile */}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
            {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
          </h2>
          {/* Shorter date on mobile to avoid wrapping */}
          <p className="text-gray-500 mt-0.5 text-xs sm:text-sm truncate">{dateStr}</p>
        </div>
        {/* New Task only on md+ — mobile uses FAB-style header button */}
        <button
          onClick={() => setShowTaskModal(true)}
          className="btn-primary shrink-0 hidden sm:inline-flex"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* ── Stat cards — always 2 cols, 4 cols on lg ──────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={<BarChart2   className="w-5 h-5 text-primary-600" />} iconBg="bg-primary-50"
          label="Today's Tasks" value={stats?.todayTotal     ?? 0}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}  iconBg="bg-green-50"
          label="Completed"     value={stats?.todayCompleted ?? 0} valueColor="text-green-600"
        />
        <StatCard
          icon={<Clock        className="w-5 h-5 text-blue-600"  />}  iconBg="bg-blue-50"
          label="Pending"       value={stats?.todayPending   ?? 0} valueColor="text-blue-600"
        />
        <StatCard
          icon={<AlertCircle  className="w-5 h-5 text-red-600"   />}  iconBg="bg-red-50"
          label="Overdue"       value={stats?.overdue        ?? 0} valueColor="text-red-600"
        />
      </div>

      {/* ── Progress + Streak ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Progress bar — full width on mobile, 2/3 on sm+ */}
        <div className="card p-4 sm:p-5 sm:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Today's Progress</h3>
            <span className="text-xl sm:text-2xl font-bold text-primary-600">{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 sm:h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs sm:text-sm text-gray-500">
            {stats?.todayCompleted ?? 0} of {stats?.todayTotal ?? 0} tasks completed
          </p>
        </div>

        {/* Streak */}
        <div className="card p-4 sm:p-5 flex flex-row sm:flex-col items-center justify-start sm:justify-center gap-3 sm:gap-0 sm:text-center">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center sm:mb-3 shrink-0">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{streak}</p>
            <p className="text-sm text-gray-500">Day streak</p>
            <p className="text-xs text-gray-400 hidden sm:block mt-0.5">Keep it up! 🔥</p>
          </div>
        </div>
      </div>

      {/* ── 7-Day Productivity Chart ───────────────────────────────────────── */}
      {data?.dailyStats && data.dailyStats.some((d) => d.completed > 0) && (
        <div className="card p-4 sm:p-5 overflow-hidden">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 shrink-0" />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">7-Day Productivity</h3>
          </div>
          {/* Chart bars — flex so they fill container, never overflow */}
          <div className="flex items-end gap-1 sm:gap-2 h-16 sm:h-20 w-full">
            {data.dailyStats.map((d) => {
              const max    = Math.max(...data.dailyStats.map((x) => x.completed), 1);
              const height = Math.max((d.completed / max) * 100, 4);
              const isToday = d.date === new Date().toISOString().split('T')[0];
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium leading-none">
                    {d.completed || ''}
                  </span>
                  <div
                    className={`w-full rounded-t transition-all duration-500 ${
                      isToday ? 'bg-primary-600' : 'bg-primary-200'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] sm:text-xs text-gray-400 leading-none">
                    {new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Today's Tasks + Overdue/Upcoming ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

        {/* Today's Tasks */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Today's Tasks</h3>
            <button
              onClick={() => navigate('/tasks')}
              className="text-sm text-primary-600 hover:underline flex items-center gap-1 touch-manipulation"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {data?.todayTasks.length === 0 ? (
            <EmptyState
              message="No tasks for today"
              action={() => setShowTaskModal(true)}
              actionLabel="Add a task"
            />
          ) : (
            <div className="space-y-2">
              {data?.todayTasks.slice(0, 5).map((task) => (
                <TaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} />
              ))}
            </div>
          )}
        </div>

        {/* Overdue + Upcoming */}
        <div className="space-y-5 min-w-0">
          {(data?.overdueTasks.length ?? 0) > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm sm:text-base">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                Overdue ({data?.overdueTasks.length})
              </h3>
              <div className="space-y-2">
                {data?.overdueTasks.slice(0, 3).map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} />
                ))}
              </div>
            </div>
          )}

          {(data?.upcomingTasks.length ?? 0) > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 text-sm sm:text-base">Upcoming</h3>
              <div className="space-y-2">
                {data?.upcomingTasks.map((task) => (
                  <div key={task.id} className="card p-3 flex items-center gap-3 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: task.category?.color || '#6366f1' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-gray-500">{task.dueDate ? formatDateShort(task.dueDate) : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile-only floating Add Task button */}
      <button
        onClick={() => setShowTaskModal(true)}
        className="sm:hidden fixed bottom-20 right-4 z-20
                   w-14 h-14 rounded-full bg-primary-600 text-white shadow-lg
                   flex items-center justify-center
                   hover:bg-primary-700 active:bg-primary-800
                   transition-colors touch-manipulation"
        aria-label="Add new task"
      >
        <Plus className="w-6 h-6" />
      </button>

      {showTaskModal && (
        <TaskModal
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => { setShowTaskModal(false); load(); }}
        />
      )}
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function StatCard({
  icon, iconBg, label, value, valueColor = 'text-gray-900',
}: {
  icon: React.ReactNode; iconBg: string; label: string; value: number; valueColor?: string;
}) {
  return (
    <div className="card p-3 sm:p-4">
      <div className={`w-9 h-9 sm:w-10 sm:h-10 ${iconBg} rounded-lg flex items-center justify-center mb-2 sm:mb-3`}>
        {icon}
      </div>
      <p className={`text-xl sm:text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs sm:text-sm text-gray-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function EmptyState({
  message, action, actionLabel,
}: {
  message: string; action?: () => void; actionLabel?: string;
}) {
  return (
    <div className="card p-6 sm:p-8 text-center">
      <p className="text-gray-400 text-sm">{message}</p>
      {action && actionLabel && (
        <button onClick={action} className="mt-3 text-sm text-primary-600 hover:underline touch-manipulation">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
