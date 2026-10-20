import { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Bell,
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarCheck,
  Shuffle,
  Coffee,
} from 'lucide-react';
import { plannerService } from '../services/planner.service';
import { useToastContext } from '../context/ToastContext';
import { cn } from '../utils';

interface Props {
  onExploreOther?: () => void;
}

export default function AutoScheduleComingSoon({ onExploreOther }: Props) {
  const { toast } = useToastContext();
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activePreview, setActivePreview] = useState<'timeline' | 'rules'>('timeline');

  useEffect(() => {
    const saved = localStorage.getItem('auto_schedule_waitlist');
    if (saved) setEnrolled(true);
  }, []);

  async function handleJoinWaitlist() {
    setLoading(true);
    try {
      const res = await plannerService.joinWaitlist();
      localStorage.setItem('auto_schedule_waitlist', 'true');
      setEnrolled(true);
      toast(res.message, 'success');
      window.dispatchEvent(new CustomEvent('notification-received'));
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Failed to join waitlist', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in text-gray-900">
      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white shadow-xl">
        <div className="relative z-10 space-y-3 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400/30 backdrop-blur-md text-xs font-semibold text-purple-200">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span>Autonomous Intelligence • Coming Soon</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Automatic AI Schedule
          </h2>

          <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed">
            Zero-effort daily scheduling. Just add your to-dos, and the AI autonomously slots them
            into optimal focus blocks, auto-shifts around delays, and coordinates your day seamlessly.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {enrolled ? (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs sm:text-sm font-semibold backdrop-blur-md">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>You're on the Priority Early Access List!</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleJoinWaitlist}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-900/40 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <span>Reserving your spot...</span>
                ) : (
                  <>
                    <Bell className="w-4 h-4" />
                    <span>Join Early Access Beta</span>
                  </>
                )}
              </button>
            )}

            {onExploreOther && (
              <button
                type="button"
                onClick={onExploreOther}
                className="text-xs text-purple-200 hover:text-white underline underline-offset-4 px-2 py-1"
              >
                Use Goal Planner instead →
              </button>
            )}
          </div>
        </div>

        {/* Ambient glow decoration */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* ── Feature Highlights Grid ──────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          What Automatic AI Scheduling Does For You
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Feature 1 */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-purple-200 hover:shadow-sm transition-all space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-sm text-gray-900">
              Autonomous Time-Blocking
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Eliminates decision fatigue. Automatically calculates the ideal 30–90 min focus blocks
              for each task throughout your available day.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-purple-200 hover:shadow-sm transition-all space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shuffle className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-sm text-gray-900">
              Real-Time Dynamic Auto-Shift
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              When a meeting runs late or a task takes extra time, the AI instantly ripples and re-balances
              subsequent tasks into later slots without manual intervention.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-purple-200 hover:shadow-sm transition-all space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-sm text-gray-900">
              Peak Energy Rhythm Learning
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Learns your completion patterns and pairs high-cognitive tasks with your personal peak focus
              hours, reserving admin tasks for low-energy dips.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-4 rounded-xl border border-gray-200 bg-white hover:border-purple-200 hover:shadow-sm transition-all space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-sm text-gray-900">
              Burnout & Buffer Guard
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Guards buffer zones between intense milestones, schedules healthy breaks, and prevents
              over-committing beyond realistic daily capacity.
            </p>
          </div>
        </div>
      </div>

      {/* ── Interactive Sneak Peek Simulation ───────────────────────── */}
      <div className="border border-purple-100 rounded-2xl bg-gradient-to-b from-purple-50/40 to-white p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-purple-600" />
            <span className="font-bold text-xs sm:text-sm text-gray-900">
              Sneak Peek: Autonomous Schedule Timeline
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-gray-500 font-medium">AI Live Simulation</span>
          </div>
        </div>

        {/* Timeline Items Mockup */}
        <div className="space-y-2.5">
          {/* Block 1 */}
          <div className="p-3 bg-white border border-gray-200/80 rounded-xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-md shrink-0">
                09:00 - 10:30
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  Deep Work: Machine Learning Architecture
                </p>
                <p className="text-[11px] text-gray-500">
                  Priority: High • 90 mins • Focus Block
                </p>
              </div>
            </div>
            <span className="badge bg-indigo-50 text-indigo-700 text-[10px] shrink-0">
              Peak Focus
            </span>
          </div>

          {/* Block 2 (Auto shifted) */}
          <div className="p-3 bg-white border border-gray-200/80 rounded-xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-md shrink-0">
                10:45 - 11:30
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  Code Review & API Endpoint Testing
                </p>
                <p className="text-[11px] text-gray-500">
                  Auto-shifted +15m to preserve deep work buffer
                </p>
              </div>
            </div>
            <span className="badge bg-purple-50 text-purple-700 text-[10px] shrink-0">
              Auto-Shifted
            </span>
          </div>

          {/* Buffer Block */}
          <div className="p-2.5 bg-emerald-50/40 border border-dashed border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800">
            <Coffee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>12:00 PM - 01:00 PM • Healthy Recharge Break & Lunch (Buffer Protected)</span>
          </div>

          {/* Block 3 */}
          <div className="p-3 bg-white border border-gray-200/80 rounded-xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-md shrink-0">
                02:00 - 02:45
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  Workout: 45 min Gym Session
                </p>
                <p className="text-[11px] text-gray-500">
                  Photo verification will verify completion
                </p>
              </div>
            </div>
            <span className="badge bg-green-50 text-green-700 text-[10px] shrink-0">
              Photo Verified
            </span>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 text-center pt-1">
          💡 When enabled, the AI acts as an autonomous executive assistant keeping your schedule in sync all day.
        </p>
      </div>
    </div>
  );
}
