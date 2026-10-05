import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Tag,
  Settings,
  LogOut,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../utils';

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks',      icon: CheckSquare,     label: 'My Tasks'  },
  { to: '/calendar',   icon: Calendar,        label: 'Calendar'  },
  { to: '/categories', icon: Tag,             label: 'Categories'},
  { to: '/settings',   icon: Settings,        label: 'Settings'  },
];

interface Props {
  onClose: () => void;
}

export default function Sidebar({ onClose }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-100 shadow-sm">
      {/* ── Logo / close ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg leading-none">TaskFlow</span>
        </div>

        {/* Close button — only shown on mobile where sidebar is a drawer */}
        <button
          onClick={onClose}
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}           /* close drawer on mobile after tap */
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                'transition-colors duration-150 select-none touch-manipulation min-h-[44px]',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ].join(' ')
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── User profile / sign-out ───────────────────────────────────── */}
      <div className="px-3 py-4 border-t border-gray-100 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg min-w-0">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm shrink-0">
            {user ? getInitials(user.name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-1 flex items-center gap-3 w-full px-3 py-2.5 min-h-[44px] rounded-lg
                     text-sm font-medium text-gray-600
                     hover:bg-red-50 hover:text-red-600
                     transition-colors duration-150 touch-manipulation"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );
}
