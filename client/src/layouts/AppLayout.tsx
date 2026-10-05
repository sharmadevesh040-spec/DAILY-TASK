import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Mobile sidebar backdrop ──────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      {/* Mobile: fixed slide-in drawer from left
          Desktop: always-visible static sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0 lg:z-auto lg:shrink-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content — extra bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom navigation (hidden on lg+) ─────────────────────── */}
      <BottomNav />
    </div>
  );
}
