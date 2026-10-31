import { useState, useEffect } from 'react';
import { Menu, Bell, Plus, Sparkles, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TaskModal from './TaskModal';
import SmartPlannerModal from './SmartPlannerModal';
import NotificationCenter from './NotificationCenter';
import { notificationService } from '../services/notification.service';
import { getInitials } from '../utils';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tasks': 'My Tasks',
  '/calendar': 'Calendar',
  '/categories': 'Categories',
  '/planner': 'AI Planner',
  '/settings': 'Settings',
};

interface Props {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const title = pageTitles[location.pathname] || 'TaskFlow';

  // Fetch unread notification count
  useEffect(() => {
    let mounted = true;
    async function fetchUnread() {
      try {
        const data = await notificationService.getNotifications({ unreadOnly: true, limit: 1 });
        if (mounted) setUnreadCount(data.unreadCount);
      } catch {
        // ignore on unmount/offline
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000); // refresh every minute
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <header className="bg-white border-b border-gray-100 shrink-0 px-3 sm:px-4 lg:px-5">
        <div className="flex items-center justify-between h-14 gap-2">
          {/* ── Left: hamburger (mobile only) + page title ──────────── */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onMenuClick}
              className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg
                         text-gray-500 hover:bg-gray-100 active:bg-gray-200
                         transition-colors shrink-0 touch-manipulation"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
              {title}
            </h1>
          </div>

          {/* ── Right: actions ─────────────────────────────────────── */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* AI Planner button */}
            <button
              onClick={() => setShowPlannerModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold
                         bg-gradient-to-r from-primary-50 to-purple-50 text-primary-700 hover:from-primary-100 hover:to-purple-100
                         border border-primary-200/60 shadow-xs transition-all touch-manipulation"
              aria-label="Open AI Planner"
            >
              <Sparkles className="w-4 h-4 text-primary-600" />
              <span className="hidden sm:inline">AI Planner</span>
            </button>

            {/* New Task button */}
            <button
              onClick={() => setShowTaskModal(true)}
              className="btn-primary px-3 sm:px-4 py-1.5 gap-1.5 text-xs sm:text-sm"
              aria-label="Create new task"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">New Task</span>
            </button>

            {/* Notifications Button with Badge */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative flex items-center justify-center w-10 h-10 rounded-lg
                         text-gray-500 hover:bg-gray-100 active:bg-gray-200
                         transition-colors touch-manipulation"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs animate-scale-in">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Avatar / settings */}
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center justify-center w-9 h-9 rounded-full
                         bg-primary-100 text-primary-700 font-semibold text-sm
                         hover:bg-primary-200 active:bg-primary-300
                         transition-colors shrink-0 touch-manipulation"
              aria-label="Open settings"
              title={`${user?.name || 'User'} (Settings)`}
            >
              {user?.name ? getInitials(user.name) : 'U'}
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-9 h-9 rounded-lg
                         text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100
                         transition-colors shrink-0 touch-manipulation"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <TaskModal
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => {
            setShowTaskModal(false);
            window.dispatchEvent(new CustomEvent('task-created'));
          }}
        />
      )}

      {/* AI Smart Planner Modal */}
      {showPlannerModal && (
        <SmartPlannerModal
          onClose={() => setShowPlannerModal(false)}
          onSuccess={() => {
            setShowPlannerModal(false);
            window.dispatchEvent(new CustomEvent('task-created'));
          }}
        />
      )}

      {/* Notification Center Slide-over */}
      <NotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
}
