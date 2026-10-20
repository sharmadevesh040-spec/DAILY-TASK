import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  Sparkles,
  AlertTriangle,
  Clock,
  AlertCircle,
  CheckCircle2,
  BellRing,
  ExternalLink,
} from 'lucide-react';
import { NotificationItem, NotificationType } from '../types';
import { notificationService } from '../services/notification.service';
import { useToastContext } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export default function NotificationCenter({ isOpen, onClose, onUnreadChange }: Props) {
  const { toast } = useToastContext();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [pushState, setPushState] = useState<{
    supported: boolean;
    permission: NotificationPermission;
  }>({
    supported: false,
    permission: 'default',
  });
  const [subscribingPush, setSubscribingPush] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);

  // Check push support on mount
  useEffect(() => {
    const supported = notificationService.isPushSupported();
    const permission = notificationService.getPermissionState();
    setPushState({ supported, permission });
  }, []);

  // Fetch notifications when opened
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, filter]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications({
        unreadOnly: filter === 'unread',
      });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      onUnreadChange?.(data.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      const result = await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(result.unreadCount);
      onUnreadChange?.(result.unreadCount);
    } catch {
      toast('Failed to mark notification as read', 'error');
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      onUnreadChange?.(0);
      toast('All notifications marked as read', 'success');
    } catch {
      toast('Failed to mark all as read', 'error');
    }
  }

  async function handleDelete(id: string) {
    try {
      const result = await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount(result.unreadCount);
      onUnreadChange?.(result.unreadCount);
    } catch {
      toast('Failed to delete notification', 'error');
    }
  }

  async function handleEnablePush() {
    setSubscribingPush(true);
    try {
      const result = await notificationService.subscribePush();
      setPushState({
        supported: true,
        permission: notificationService.getPermissionState(),
      });
      toast(result.message, result.success ? 'success' : 'info');
    } catch (err: any) {
      toast(err?.message || 'Failed to enable push notifications', 'error');
    } finally {
      setSubscribingPush(false);
    }
  }

  function getNotificationIcon(type: NotificationType) {
    switch (type) {
      case 'VERIFICATION_SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'VERIFICATION_REJECTED':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'TASK_DEADLINE':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'TASK_OVERDUE':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'PLANNER_REMINDER':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-primary-600" />;
    }
  }

  function formatTimeAgo(dateString: string) {
    const now = new Date();
    const past = new Date(dateString);
    const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-fade-in">
      <div
        ref={panelRef}
        className="w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-gray-900 text-base">Notifications</h2>
            {unreadCount > 0 && (
              <span className="badge bg-primary-100 text-primary-700 text-xs font-semibold px-2">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary-600 hover:text-primary-800 font-medium px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Browser Push Banner ────────────────────────────────────────── */}
        {pushState.supported && pushState.permission === 'default' && (
          <div className="p-3 bg-primary-50 border-b border-primary-100 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <BellRing className="w-4 h-4 text-primary-600 shrink-0" />
              <p className="text-xs text-primary-900 truncate">
                Get push alerts for deadlines & AI verification
              </p>
            </div>
            <button
              onClick={handleEnablePush}
              disabled={subscribingPush}
              className="btn-primary text-xs py-1 px-2.5 shrink-0"
            >
              {subscribingPush ? 'Enabling...' : 'Enable'}
            </button>
          </div>
        )}

        {/* ── Filter Tabs ─────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-100 px-5 pt-2 gap-4 shrink-0 bg-white">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'pb-2 text-xs font-semibold border-b-2 transition-colors',
              filter === 'all'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'pb-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5',
              filter === 'unread'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* ── List Content ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-gray-600">No notifications</p>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                {filter === 'unread'
                  ? 'You are all caught up! No unread notifications.'
                  : 'You will receive notifications here for AI task verification, reminders, and deadlines.'}
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'p-3 rounded-xl border transition-all text-xs space-y-1 relative group',
                  item.isRead
                    ? 'bg-white border-gray-100 hover:border-gray-200'
                    : 'bg-primary-50/40 border-primary-100 hover:border-primary-200'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0">{getNotificationIcon(item.type)}</span>
                    <h4
                      className={cn(
                        'font-semibold text-gray-900',
                        !item.isRead && 'font-bold'
                      )}
                    >
                      {item.title}
                    </h4>
                  </div>

                  <span className="text-[10px] text-gray-400 shrink-0">
                    {formatTimeAgo(item.createdAt)}
                  </span>
                </div>

                <p className="text-gray-600 leading-relaxed pl-6">
                  {item.message}
                </p>

                {/* Actions row */}
                <div className="flex items-center justify-between pt-1 pl-6">
                  {item.taskId ? (
                    <button
                      onClick={() => {
                        navigate('/tasks');
                        onClose();
                      }}
                      className="text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1 text-[11px]"
                    >
                      <span>View task</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100">
                    {!item.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(item.id)}
                        className="text-gray-400 hover:text-primary-600 text-[11px] flex items-center gap-0.5"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3" />
                        <span>Read</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-gray-400 hover:text-red-600 p-0.5"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
