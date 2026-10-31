import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Task } from '../types';
import { alarmService } from '../services/alarm.service';
import AlarmModal, { ActiveAlarm } from '../components/AlarmModal';
import PhotoCompletionModal from '../components/PhotoCompletionModal';
import { taskService } from '../services/task.service';
import { useAuth } from './AuthContext';

interface AlarmContextType {
  activeAlarm: ActiveAlarm | null;
  triggerTaskStartAlarm: (task: Task) => void;
  triggerDeadlineAlarm: (task: Task, minutesRemaining: number) => void;
  dismissAlarm: () => void;
  testAlarm: (type: 'start' | 'deadline') => void;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

function parseDeadline(dueDate?: string, dueTime?: string): Date | null {
  if (!dueDate) return null;
  const dateStr = dueDate.includes('T') ? dueDate.split('T')[0] : dueDate;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;

  let h = 23;
  let min = 59;
  if (dueTime) {
    const parts = dueTime.split(':').map(Number);
    if (!isNaN(parts[0]) && !isNaN(parts[1])) {
      h = parts[0];
      min = parts[1];
    }
  }

  return new Date(y, m - 1, d, h, min, 59, 999);
}

export function AlarmProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const [photoModalTask, setPhotoModalTask] = useState<Task | null>(null);

  // Stop alarm sound and clear active state
  const dismissAlarm = useCallback(() => {
    alarmService.stopAlarm();
    setActiveAlarm(null);
  }, []);

  // Trigger Task Start Alarm
  const triggerTaskStartAlarm = useCallback((task: Task) => {
    alarmService.unlockAudio();
    alarmService.playTaskStartSound();

    const title = 'Task Started! ⏰';
    const message = `You started "${task.title}". Focus mode on — time to make progress!`;

    alarmService.showSystemAlarmNotification(title, message, `start-${task.id}`);

    setActiveAlarm({
      taskId: task.id,
      taskTitle: task.title,
      type: 'TASK_START',
      title,
      message,
      task,
    });
  }, []);

  // Trigger Deadline Warning Alarm
  const triggerDeadlineAlarm = useCallback((task: Task, minutesRemaining: number) => {
    alarmService.unlockAudio();
    alarmService.playDeadlineAlarm(true);

    const isUrgent = minutesRemaining <= 10;
    const title = isUrgent ? '🚨 Urgent: Deadline Approaching!' : '⏰ Task Deadline Reminder';
    const message =
      minutesRemaining > 0
        ? `"${task.title}" submission deadline is in ${minutesRemaining} minutes. Remember to upload your photo proof before the time limit expires!`
        : `"${task.title}" submission deadline has arrived! Please complete your submission immediately.`;

    alarmService.showSystemAlarmNotification(title, message, `deadline-${task.id}`);

    setActiveAlarm({
      taskId: task.id,
      taskTitle: task.title,
      type: 'DEADLINE_APPROACHING',
      title,
      message,
      dueTimeFormatted: task.dueTime || 'End of Day',
      task,
    });
  }, []);

  // Test alarm sound directly from settings or preview
  const testAlarm = useCallback((type: 'start' | 'deadline') => {
    alarmService.unlockAudio();
    if (type === 'start') {
      alarmService.playTaskStartSound();
      setActiveAlarm({
        taskId: 'test',
        taskTitle: 'Sample Task: Design Review',
        type: 'TASK_START',
        title: 'Task Started! ⏰',
        message: 'This is a test of the task start alarm sound and phone vibration.',
      });
    } else {
      alarmService.playDeadlineAlarm(true);
      setActiveAlarm({
        taskId: 'test',
        taskTitle: 'Sample Task: Project Submission',
        type: 'DEADLINE_APPROACHING',
        title: '🚨 Deadline Approaching!',
        message: 'This is a test of the task submission deadline alarm and phone vibration.',
        dueTimeFormatted: '5:00 PM',
      });
    }
  }, []);

  // Unlock AudioContext on first document interaction
  useEffect(() => {
    const handleGesture = () => {
      alarmService.unlockAudio();
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };

    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('touchstart', handleGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, []);

  // Periodic deadline & start monitor for today's active tasks
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;

    async function checkTasksForAlarms() {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await taskService.getTasks({
          status: 'ALL',
          dateFrom: todayStr,
          dateTo: todayStr,
        });

        if (!isMounted || !res.tasks) return;

        const now = new Date();

        for (const task of res.tasks) {
          // Skip completed tasks
          if (task.status === 'COMPLETED') continue;

          const deadline = parseDeadline(task.dueDate, task.dueTime);
          if (!deadline) continue;

          const diffMs = deadline.getTime() - now.getTime();
          const diffMinutes = Math.floor(diffMs / (60 * 1000));

          // 1. Deadline warning alarm (within 15 minutes of deadline and not overdue)
          const sessionKeyDeadline = `alarm_deadline_${task.id}_${todayStr}`;
          if (diffMinutes >= 0 && diffMinutes <= 15 && !sessionStorage.getItem(sessionKeyDeadline)) {
            sessionStorage.setItem(sessionKeyDeadline, 'true');
            triggerDeadlineAlarm(task, diffMinutes);
            break; // Trigger one alarm at a time
          }

          // 2. Reminder time check (if explicit reminders are set)
          if (task.reminders && task.reminders.length > 0) {
            for (const rem of task.reminders) {
              const remTime = new Date(rem.reminderTime);
              const remDiffMs = remTime.getTime() - now.getTime();
              const remDiffMinutes = Math.floor(remDiffMs / (60 * 1000));

              const sessionKeyRem = `alarm_rem_${rem.id}_${todayStr}`;
              if (
                remDiffMinutes >= 0 &&
                remDiffMinutes <= 2 &&
                !sessionStorage.getItem(sessionKeyRem)
              ) {
                sessionStorage.setItem(sessionKeyRem, 'true');
                triggerDeadlineAlarm(task, Math.max(0, diffMinutes));
                break;
              }
            }
          }
        }
      } catch {
        // Ignore background polling errors
      }
    }

    // Check immediately on mount, then every 30 seconds
    checkTasksForAlarms();
    const interval = setInterval(checkTasksForAlarms, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, triggerDeadlineAlarm]);

  return (
    <AlarmContext.Provider
      value={{
        activeAlarm,
        triggerTaskStartAlarm,
        triggerDeadlineAlarm,
        dismissAlarm,
        testAlarm,
      }}
    >
      {children}

      {/* Render Alarm Modal when active */}
      {activeAlarm && (
        <AlarmModal
          alarm={activeAlarm}
          onDismiss={dismissAlarm}
          onOpenPhotoModal={(task) => {
            dismissAlarm();
            setPhotoModalTask(task);
          }}
        />
      )}

      {/* Render Photo Modal if opened from deadline alarm */}
      {photoModalTask && (
        <PhotoCompletionModal
          task={photoModalTask}
          onClose={() => setPhotoModalTask(null)}
          onSuccess={() => {
            setPhotoModalTask(null);
            window.dispatchEvent(new CustomEvent('task-updated'));
          }}
        />
      )}
    </AlarmContext.Provider>
  );
}

export function useAlarm() {
  const context = useContext(AlarmContext);
  if (!context) {
    throw new Error('useAlarm must be used within an AlarmProvider');
  }
  return context;
}
