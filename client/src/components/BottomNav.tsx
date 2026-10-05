import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Calendar, Tag, Settings } from 'lucide-react';

const navItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Home'     },
  { to: '/tasks',      icon: CheckSquare,     label: 'Tasks'    },
  { to: '/calendar',   icon: Calendar,        label: 'Calendar' },
  { to: '/categories', icon: Tag,             label: 'Tags'     },
  { to: '/settings',   icon: Settings,        label: 'Settings' },
];

export default function BottomNav() {
  return (
    /* Only visible on mobile/tablet, hidden on lg+ */
    <nav
      className={[
        'lg:hidden',
        'fixed bottom-0 inset-x-0 z-50',
        'bg-white border-t border-gray-200',
        'flex items-stretch',
        /* respect notch / home-bar */
        'pb-safe',
      ].join(' ')}
      aria-label="Mobile navigation"
    >
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              'flex flex-col items-center justify-center flex-1 gap-0.5',
              'py-2 min-h-[56px] text-[10px] font-medium',
              'transition-colors duration-150 select-none touch-manipulation',
              isActive
                ? 'text-primary-600'
                : 'text-gray-500 hover:text-gray-800',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={[
                  'flex items-center justify-center w-6 h-6 rounded-md transition-colors',
                  isActive ? 'text-primary-600' : 'text-gray-400',
                ].join(' ')}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
              </span>
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
