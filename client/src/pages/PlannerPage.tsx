import { useState } from 'react';
import SmartPlannerModal from '../components/SmartPlannerModal';
import { Sparkles, CalendarClock, ListTodo, CheckCircle2, ArrowRight, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PlannerPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'plan' | 'reschedule' | 'auto-schedule'>('plan');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>AI Productivity Engine</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            AI Smart Task Planner
          </h1>

          <p className="text-sm text-primary-100 leading-relaxed">
            Turn your goals, exams, sprints, or routines into structured, paced task schedules.
            Our AI planner estimates durations, prioritizes urgent milestones, and reorganizes overdue tasks.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              onClick={() => {
                setModalTab('plan');
                setShowModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-white text-primary-700 hover:bg-primary-50 font-semibold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <ListTodo className="w-4 h-4 text-primary-600" />
              <span>Create Plan</span>
            </button>

            <button
              onClick={() => {
                setModalTab('reschedule');
                setShowModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 font-semibold text-xs sm:text-sm backdrop-blur-md transition-all flex items-center gap-2 text-white"
            >
              <CalendarClock className="w-4 h-4" />
              <span>Reschedule Overdue</span>
            </button>

            <button
              onClick={() => {
                setModalTab('auto-schedule');
                setShowModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-purple-500/30 hover:bg-purple-500/50 border border-purple-300/30 font-semibold text-xs sm:text-sm backdrop-blur-md transition-all flex items-center gap-2 text-purple-100"
            >
              <Bot className="w-4 h-4 text-yellow-300" />
              <span>Auto-Schedule (Coming Soon)</span>
            </button>
          </div>
        </div>

        {/* Ambient illustration background */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* ── Feature Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Goal Decomposition */}
        <div
          onClick={() => {
            setModalTab('plan');
            setShowModal(true);
          }}
          className="card p-5 cursor-pointer hover:border-primary-300 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1 flex items-center justify-between">
              <span>Goal Planning</span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Describe your project in plain English. The AI breaks it down into actionable tasks,
              subtasks, durations, and dates.
            </p>
          </div>
          <span className="text-xs font-semibold text-primary-600 mt-3 block">
            Plan Tasks →
          </span>
        </div>

        {/* Card 2: Smart Rescheduling */}
        <div
          onClick={() => {
            setModalTab('reschedule');
            setShowModal(true);
          }}
          className="card p-5 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <CalendarClock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-base mb-1 flex items-center justify-between">
              <span>Missed Tasks</span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Fell behind schedule? The AI redistributes overdue tasks across upcoming days to prevent backlog burnout.
            </p>
          </div>
          <span className="text-xs font-semibold text-amber-600 mt-3 block">
            Reschedule Backlog →
          </span>
        </div>

        {/* Card 3: Automatic AI Schedule (Coming Soon) */}
        <div
          onClick={() => {
            setModalTab('auto-schedule');
            setShowModal(true);
          }}
          className="card p-5 cursor-pointer border-purple-200/80 bg-gradient-to-b from-purple-50/50 to-white hover:border-purple-400 hover:shadow-md transition-all group flex flex-col justify-between relative overflow-hidden"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Bot className="w-5 h-5" />
              </div>
              <span className="badge bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            </div>

            <h3 className="font-bold text-gray-900 text-base mb-1 flex items-center justify-between">
              <span>Auto-Schedule</span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Autonomous time-blocking that dynamically shifts your day when delays happen and learns your peak energy rhythms.
            </p>
          </div>
          <span className="text-xs font-semibold text-purple-600 mt-3 block">
            Join Early Access Beta →
          </span>
        </div>
      </div>

      {/* ── Photo Verification Notice ─────────────────────────────────── */}
      <div className="card p-5 bg-gradient-to-r from-green-50/50 to-emerald-50/50 border-green-200/60 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-green-950">
            Photo-Required Completion Verification
          </h4>
          <p className="text-xs text-green-900/80 leading-relaxed">
            All planned tasks require a visual completion photo when finished. Snap a photo of your study notes,
            workspace, workout, or completed errand, and our AI vision system will verify the evidence before marking it complete!
          </p>
        </div>
      </div>

      {/* Planner Modal */}
      {showModal && (
        <SmartPlannerModal
          defaultTab={modalTab}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            navigate('/tasks');
          }}
        />
      )}
    </div>
  );
}
