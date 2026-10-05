import { useState } from 'react';
import { Menu, Bell, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TaskModal from './TaskModal';
import { getInitials } from '../utils';

const pageTitles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/tasks':      'My Tasks',
  '/calendar':   'Calendar',
  '/categories': 'Categories',
  '/settings':   'Settings',
};

interface Props {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: Props) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showTaskModal, setShowTaskModal] = useState(false);

  const title = pageTitles[location.pathname] || 'TaskFlow';

  return (
    <>
      <header className="bg-white border-b border-gray-100 shrink-0 px-3 sm:px-4 lg:px-5">
        <div className="flex items-center justify-between h-14 gap-2">

          {/* ── Left: hamburger (mobile only) + page title ──────────── */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Hamburger — only on mobile/tablet; desktop sidebar is always visible */}
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
          <div className="flex items-center gap-1.5 shrink-0">
            {/* New Task button — icon-only on mobile, labelled on sm+ */}
            <button
              onClick={() => setShowTaskModal(true)}
              className="btn-primary px-3 sm:px-4 gap-1.5"
              aria-label="Create new task"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">New Task</span>
            </button>

            {/* Notifications */}
            <button
              className="flex items-center justify-center w-10 h-10 rounded-lg
                         text-gray-500 hover:bg-gray-100 active:bg-gray-200
                         transition-colors touch-manipulation"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>

            {/* Avatar / settings */}
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center justify-center w-9 h-9 rounded-full
                         bg-primary-100 text-primary-700 font-semibold text-sm
                         hover:bg-primary-200 active:bg-primary-300
                         transition-colors shrink-0 touch-manipulation"
              aria-label="Open settings"
            >
              {user?.name ? getInitials(user.name) : 'U'}
            </button>
          </div>
        </div>
      </header>

      {showTaskModal && (
        <TaskModal
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => {
            setShowTaskModal(false);
            window.dispatchEvent(new CustomEvent('task-created'));
          }}
        />
      )}
    </>
  );
}
