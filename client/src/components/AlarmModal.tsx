import React from 'react';
import { Bell, Clock, AlertTriangle, Sparkles, CheckCircle2, Volume2, VolumeX, Camera, X } from 'lucide-react';
import { Task } from '../types';

export interface ActiveAlarm {
  taskId: string;
  taskTitle: string;
  type: 'TASK_START' | 'DEADLINE_APPROACHING' | 'DEADLINE_PASSED';
  title: string;
  message: string;
  dueTimeFormatted?: string;
  task?: Task;
}

interface Props {
  alarm: ActiveAlarm;
  onDismiss: () => void;
  onOpenPhotoModal?: (task: Task) => void;
}

export default function AlarmModal({ alarm, onDismiss, onOpenPhotoModal }: Props) {
  const isStart = alarm.type === 'TASK_START';
  const isDeadline = alarm.type === 'DEADLINE_APPROACHING' || alarm.type === 'DEADLINE_PASSED';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient banner */}
        <div
          className={`relative px-5 py-4 text-white flex items-center justify-between ${
            isStart
              ? 'bg-gradient-to-r from-primary-600 to-indigo-700'
              : 'bg-gradient-to-r from-amber-500 to-red-600'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-bounce">
                {isStart ? (
                  <Bell className="w-5 h-5 text-white" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-white" />
                )}
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                {isStart ? 'Task Reminder' : 'Deadline Alarm'}
              </span>
              <h3 className="text-base font-bold text-white leading-tight">
                {alarm.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Task
            </p>
            <h4 className="text-base font-bold text-gray-900 leading-snug break-words">
              {alarm.taskTitle}
            </h4>
            <p className="text-xs text-gray-600 pt-0.5 leading-relaxed">
              {alarm.message}
            </p>
          </div>

          {alarm.dueTimeFormatted && (
            <div className="flex items-center gap-2 text-xs text-gray-600 px-1">
              <Clock className="w-4 h-4 text-primary-600 shrink-0" />
              <span>
                Submission Deadline: <strong className="text-gray-900">{alarm.dueTimeFormatted}</strong>
              </span>
            </div>
          )}

          {/* Sound & vibration indicator */}
          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <Volume2 className="w-4 h-4 text-primary-600 animate-pulse" />
              Alarm Sound & Vibration Active
            </span>
            <span className="text-[11px] text-gray-400">Ringing on your phone</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onDismiss}
              className="btn-secondary flex-1 py-2.5 text-xs font-medium"
            >
              <VolumeX className="w-4 h-4 mr-1 text-gray-400" />
              Dismiss Alarm
            </button>

            {isDeadline && alarm.task && onOpenPhotoModal ? (
              <button
                type="button"
                onClick={() => {
                  onDismiss();
                  if (alarm.task) onOpenPhotoModal(alarm.task);
                }}
                className="btn-primary flex-1 py-2.5 text-xs font-medium gap-1.5"
              >
                <Camera className="w-4 h-4" />
                <span>Submit Proof Now</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onDismiss}
                className="btn-primary flex-1 py-2.5 text-xs font-medium"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Let's Work!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
