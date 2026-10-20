import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Tag,
  ArrowRight,
  ListTodo,
  CalendarClock,
  Bot,
} from 'lucide-react';
import { GeneratedPlan, GeneratedTask, Priority, ReschedulePlan, RescheduleSuggestion } from '../types';
import { plannerService } from '../services/planner.service';
import { useToastContext } from '../context/ToastContext';
import AutoScheduleComingSoon from './AutoScheduleComingSoon';
import { cn } from '../utils';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  defaultTab?: 'plan' | 'reschedule' | 'auto-schedule';
}

const PRESET_PROMPTS = [
  {
    label: 'AWS Exam Prep',
    prompt: 'I want to study for my AWS Certified Solutions Architect exam next Friday. I have 2 hours every evening to study key domains, review whitepapers, practice questions, and do a full mock test on Wednesday.',
  },
  {
    label: 'Sprint Launch',
    prompt: 'Prepare and launch MVP features this week: finish user authentication, deploy database migrations, test photo verification, write documentation, and release to beta testers.',
  },
  {
    label: 'Health & Fitness',
    prompt: 'Establish a balanced weekly fitness schedule: 3 strength training workouts, 2 morning cardio runs (30 mins), meal prep on Sunday, and 1 active recovery yoga session.',
  },
  {
    label: 'Home Deep Clean',
    prompt: 'Organize and clean apartment over the weekend: clean kitchen and pantry on Saturday morning, do laundry and wash sheets, clean bathroom Sunday afternoon, and vacuum all floors.',
  },
];

export default function SmartPlannerModal({ onClose, onSuccess, defaultTab = 'plan' }: Props) {
  const { toast } = useToastContext();

  const [activeTab, setActiveTab] = useState<'plan' | 'reschedule' | 'auto-schedule'>(defaultTab);

  // ── Plan Generation State ──────────────────────────────────────────────────
  const [prompt, setPrompt] = useState('');
  const [availableHours, setAvailableHours] = useState(4);
  const [timeOfDay, setTimeOfDay] = useState<'MORNING' | 'AFTERNOON' | 'EVENING' | 'FLEXIBLE'>('FLEXIBLE');
  const [generating, setGenerating] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // Generated Plan Preview
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [editableTasks, setEditableTasks] = useState<GeneratedTask[]>([]);
  const [expandedTaskIdx, setExpandedTaskIdx] = useState<number | null>(null);

  // ── Rescheduling Assistant State ───────────────────────────────────────────
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<{
    summary: string;
    suggestions: RescheduleSuggestion[];
  } | null>(null);
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [applyingReschedule, setApplyingReschedule] = useState(false);

  // Load initial overdue count
  useEffect(() => {
    if (activeTab === 'reschedule' && !rescheduleData) {
      loadRescheduleSuggestions();
    }
  }, [activeTab]);

  async function handleGeneratePlan() {
    if (!prompt.trim()) {
      toast('Please enter your goal, project, or task requirements', 'error');
      return;
    }

    setGenerating(true);
    try {
      const plan = await plannerService.generatePlan({
        prompt: prompt.trim(),
        availableHoursPerDay: availableHours,
        preferredTimeOfDay: timeOfDay,
      });

      setGeneratedPlan(plan);
      setEditableTasks(JSON.parse(JSON.stringify(plan.tasks))); // deep copy
      setExpandedTaskIdx(0); // expand first task
      toast('AI Plan generated! Review and customize below.', 'success');
    } catch (err: any) {
      console.error('Plan generation failed:', err);
      toast(err?.response?.data?.message || 'Failed to generate plan', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSavePlan() {
    if (editableTasks.length === 0) {
      toast('No tasks to save', 'error');
      return;
    }

    setSavingPlan(true);
    try {
      const result = await plannerService.applyPlan(editableTasks);
      toast(
        `Added ${result.createdCount} tasks from AI plan!${
          result.skippedCount > 0 ? ` (${result.skippedCount} duplicates skipped)` : ''
        }`,
        'success'
      );
      window.dispatchEvent(new CustomEvent('task-created'));
      onSuccess();
    } catch (err: any) {
      console.error('Failed to save plan:', err);
      toast(err?.response?.data?.message || 'Failed to save tasks', 'error');
    } finally {
      setSavingPlan(false);
    }
  }

  async function loadRescheduleSuggestions() {
    setLoadingSuggestions(true);
    try {
      const result = await plannerService.getRescheduleSuggestions({
        availableHoursPerDay: availableHours,
      });

      setOverdueCount(result.count);
      setRescheduleData({
        summary: result.suggestions.summary,
        suggestions: result.suggestions.suggestions,
      });

      if (result.count === 0) {
        toast('No overdue tasks found to reschedule! You are up to date.', 'info');
      }
    } catch (err: any) {
      console.error('Failed to load reschedule suggestions:', err);
      toast('Failed to load reschedule suggestions', 'error');
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function handleApplyReschedule() {
    if (!rescheduleData || rescheduleData.suggestions.length === 0) return;

    setApplyingReschedule(true);
    try {
      const payload = rescheduleData.suggestions.map((s) => ({
        taskId: s.taskId,
        suggestedDueDate: s.suggestedDueDate,
        suggestedDueTime: s.suggestedDueTime || null,
      }));

      await plannerService.applyReschedule(payload);
      toast('Overdue tasks rescheduled successfully!', 'success');
      window.dispatchEvent(new CustomEvent('task-created'));
      onSuccess();
    } catch (err: any) {
      console.error('Apply reschedule error:', err);
      toast(err?.response?.data?.message || 'Failed to apply reschedule', 'error');
    } finally {
      setApplyingReschedule(false);
    }
  }

  // ── Task Edit Handlers ─────────────────────────────────────────────────────
  function updateTaskField<K extends keyof GeneratedTask>(index: number, field: K, value: GeneratedTask[K]) {
    setEditableTasks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function removeTask(index: number) {
    setEditableTasks((prev) => prev.filter((_, i) => i !== index));
  }

  function addNewTask() {
    const todayStr = new Date().toISOString().split('T')[0];
    const newTask: GeneratedTask = {
      title: 'New Planned Task',
      description: '',
      priority: 'MEDIUM',
      dueDate: todayStr,
      dueTime: '10:00',
      estimatedDuration: 30,
      categoryName: 'General',
    };
    setEditableTasks((prev) => [...prev, newTask]);
    setExpandedTaskIdx(editableTasks.length);
  }

  function addSubtask(taskIndex: number) {
    setEditableTasks((prev) => {
      const copy = [...prev];
      const task = copy[taskIndex];
      const currentSubtasks = task.subtasks || [];
      task.subtasks = [
        ...currentSubtasks,
        { title: 'New Subtask', priority: task.priority, estimatedDuration: 15 },
      ];
      return copy;
    });
  }

  function updateSubtask(taskIndex: number, subtaskIndex: number, title: string) {
    setEditableTasks((prev) => {
      const copy = [...prev];
      const subtasks = [...(copy[taskIndex].subtasks || [])];
      subtasks[subtaskIndex] = { ...subtasks[subtaskIndex], title };
      copy[taskIndex].subtasks = subtasks;
      return copy;
    });
  }

  function removeSubtask(taskIndex: number, subtaskIndex: number) {
    setEditableTasks((prev) => {
      const copy = [...prev];
      const subtasks = [...(copy[taskIndex].subtasks || [])];
      subtasks.splice(subtaskIndex, 1);
      copy[taskIndex].subtasks = subtasks;
      return copy;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* ── Modal Header ──────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-primary-50/60 via-purple-50/40 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                AI Smart Task Planner
              </h2>
              <p className="text-xs text-gray-500">
                Natural-language planning & intelligent rescheduling
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navigation Tabs ────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-100 px-5 pt-2 gap-4 shrink-0 bg-gray-50/40">
          <button
            onClick={() => setActiveTab('plan')}
            className={cn(
              'flex items-center gap-2 pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors',
              activeTab === 'plan'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            <ListTodo className="w-4 h-4" />
            <span>Generate Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('reschedule')}
            className={cn(
              'flex items-center gap-2 pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors',
              activeTab === 'reschedule'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Reschedule Assistant</span>
            {overdueCount > 0 && (
              <span className="badge bg-red-100 text-red-700 text-[10px] px-1.5 py-0.2">
                {overdueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('auto-schedule')}
            className={cn(
              'flex items-center gap-1.5 pb-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors',
              activeTab === 'auto-schedule'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}
          >
            <Bot className="w-4 h-4 text-purple-600" />
            <span className="hidden sm:inline">Auto-Schedule</span>
            <span className="sm:hidden">Auto</span>
            <span className="badge bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
              Soon
            </span>
          </button>
        </div>

        {/* ── Modal Body ─────────────────────────────────────────────────── */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* TAB 1: GENERATE PLAN */}
          {activeTab === 'plan' && (
            <>
              {!generatedPlan ? (
                /* Input Form */
                <div className="space-y-4">
                  {/* Preset chips */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Need inspiration? Try an example prompt:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_PROMPTS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setPrompt(p.prompt)}
                          className="text-xs px-2.5 py-1 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 border border-gray-200 text-gray-700 transition-colors"
                        >
                          ⚡ {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Main prompt input */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Describe your goals, project, deadlines, and preferences:
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g. I need to prepare my quarterly portfolio review by Friday. I have 3 hours each afternoon. Break down financial analysis, slide preparation, client feedback compilation, and rehearsals."
                      rows={4}
                      className="input-field text-sm leading-relaxed"
                    />
                  </div>

                  {/* Pacing & availability constraints */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
                        <span>Available Time:</span>
                        <span className="font-bold text-primary-600">{availableHours} hrs/day</span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={availableHours}
                        onChange={(e) => setAvailableHours(Number(e.target.value))}
                        className="w-full accent-primary-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Preferred Time of Day:
                      </label>
                      <select
                        value={timeOfDay}
                        onChange={(e) => setTimeOfDay(e.target.value as any)}
                        className="input-field text-xs"
                      >
                        <option value="FLEXIBLE">Flexible (Spread throughout day)</option>
                        <option value="MORNING">Morning (9am - 12pm)</option>
                        <option value="AFTERNOON">Afternoon (1pm - 5pm)</option>
                        <option value="EVENING">Evening (6pm - 9pm)</option>
                      </select>
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleGeneratePlan}
                      disabled={generating || !prompt.trim()}
                      className="btn-primary w-full py-3 gap-2 text-sm justify-center shadow-md disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <Sparkles className="w-4 h-4 animate-spin text-yellow-300" />
                          <span>Generating Smart Plan with AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-yellow-300" />
                          <span>Generate Structured Plan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Editable Plan Preview */
                <div className="space-y-4">
                  {/* Plan summary banner */}
                  <div className="p-3.5 bg-primary-50/70 border border-primary-100 rounded-xl space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-primary-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                        AI Plan Overview
                      </span>
                      <button
                        onClick={() => setGeneratedPlan(null)}
                        className="text-xs text-primary-600 hover:text-primary-800 underline"
                      >
                        Start Over
                      </button>
                    </div>
                    <p className="text-xs text-primary-800">{generatedPlan.summary}</p>
                    <p className="text-[11px] text-primary-700/80 italic">
                      Suggested Pacing: {generatedPlan.suggestedSchedule}
                    </p>
                  </div>

                  {/* Tasks count & Add task button */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      Planned Tasks ({editableTasks.length}):
                    </span>
                    <button
                      type="button"
                      onClick={addNewTask}
                      className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Task</span>
                    </button>
                  </div>

                  {/* Editable Tasks List */}
                  <div className="space-y-3">
                    {editableTasks.map((task, idx) => {
                      const isExpanded = expandedTaskIdx === idx;

                      return (
                        <div
                          key={idx}
                          className="border border-gray-200 rounded-xl p-3 bg-white hover:border-gray-300 transition-all shadow-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedTaskIdx(isExpanded ? null : idx)}
                              className="flex items-center gap-2 text-left flex-1 min-w-0"
                            >
                              <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-sm text-gray-900 truncate">
                                {task.title || 'Untitled Task'}
                              </span>
                              {task.subtasks && task.subtasks.length > 0 && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md shrink-0">
                                  {task.subtasks.length} subtasks
                                </span>
                              )}
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => removeTask(idx)}
                                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                                title="Delete task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setExpandedTaskIdx(isExpanded ? null : idx)}
                                className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Fields */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 animate-fade-in">
                              {/* Title */}
                              <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                                  Title
                                </label>
                                <input
                                  type="text"
                                  value={task.title}
                                  onChange={(e) => updateTaskField(idx, 'title', e.target.value)}
                                  className="input-field text-xs py-1.5"
                                />
                              </div>

                              {/* Description */}
                              <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                                  Description
                                </label>
                                <textarea
                                  value={task.description || ''}
                                  onChange={(e) => updateTaskField(idx, 'description', e.target.value)}
                                  rows={2}
                                  className="input-field text-xs py-1.5 resize-none"
                                />
                              </div>

                              {/* Row 1: Priority, Duration, Category */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                                    Priority
                                  </label>
                                  <select
                                    value={task.priority}
                                    onChange={(e) => updateTaskField(idx, 'priority', e.target.value as Priority)}
                                    className="input-field text-xs py-1.5"
                                  >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                                    Est. Duration (mins)
                                  </label>
                                  <input
                                    type="number"
                                    min={5}
                                    max={480}
                                    step={5}
                                    value={task.estimatedDuration || 30}
                                    onChange={(e) => updateTaskField(idx, 'estimatedDuration', Number(e.target.value))}
                                    className="input-field text-xs py-1.5"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                                    Category
                                  </label>
                                  <input
                                    type="text"
                                    value={task.categoryName || ''}
                                    onChange={(e) => updateTaskField(idx, 'categoryName', e.target.value)}
                                    placeholder="Work, Study, etc."
                                    className="input-field text-xs py-1.5"
                                  />
                                </div>
                              </div>

                              {/* Row 2: Due Date & Due Time */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                                    Due Date
                                  </label>
                                  <input
                                    type="date"
                                    value={task.dueDate || ''}
                                    onChange={(e) => updateTaskField(idx, 'dueDate', e.target.value)}
                                    className="input-field text-xs py-1.5"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-medium text-gray-600 mb-0.5">
                                    Due Time
                                  </label>
                                  <input
                                    type="time"
                                    value={task.dueTime || ''}
                                    onChange={(e) => updateTaskField(idx, 'dueTime', e.target.value)}
                                    className="input-field text-xs py-1.5"
                                  />
                                </div>
                              </div>

                              {/* Subtasks Section */}
                              <div className="pt-1">
                                <div className="flex items-center justify-between text-[11px] font-medium text-gray-600 mb-1">
                                  <span>Subtasks</span>
                                  <button
                                    type="button"
                                    onClick={() => addSubtask(idx)}
                                    className="text-primary-600 hover:text-primary-700 font-semibold"
                                  >
                                    + Add Subtask
                                  </button>
                                </div>

                                {task.subtasks && task.subtasks.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {task.subtasks.map((st, sIdx) => (
                                      <div key={sIdx} className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                                        <input
                                          type="text"
                                          value={st.title}
                                          onChange={(e) => updateSubtask(idx, sIdx, e.target.value)}
                                          className="input-field text-xs py-1 flex-1"
                                          placeholder="Subtask description"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeSubtask(idx, sIdx)}
                                          className="text-gray-400 hover:text-red-500 p-1"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-gray-400 italic">No subtasks added.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Save plan action */}
                  <div className="flex items-center gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setGeneratedPlan(null)}
                      className="btn-secondary py-2.5 px-4 text-xs"
                    >
                      Back to Prompt
                    </button>

                    <button
                      type="button"
                      onClick={handleSavePlan}
                      disabled={savingPlan || editableTasks.length === 0}
                      className="btn-primary py-2.5 px-6 gap-2 flex-1 justify-center text-sm shadow-md"
                    >
                      {savingPlan ? (
                        <span>Saving Tasks to Database...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-200" />
                          <span>Approve & Create {editableTasks.length} Tasks</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: RESCHEDULE ASSISTANT */}
          {activeTab === 'reschedule' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  The AI Reschedule Assistant analyzes overdue and missed tasks, balances your available time,
                  and redistributes tasks into realistic upcoming slots.
                </p>
              </div>

              {loadingSuggestions ? (
                <div className="py-12 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-primary-600 animate-spin mx-auto" />
                  <p className="text-xs text-gray-500 font-medium">
                    Analyzing overdue tasks and calculating schedule distribution...
                  </p>
                </div>
              ) : rescheduleData ? (
                <div className="space-y-4">
                  <div className="text-xs font-semibold text-gray-700">
                    {rescheduleData.summary}
                  </div>

                  {rescheduleData.suggestions.length > 0 ? (
                    <div className="space-y-2.5">
                      {rescheduleData.suggestions.map((s, idx) => (
                        <div
                          key={s.taskId}
                          className="p-3 border border-gray-200 rounded-xl bg-gray-50/50 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-gray-900">
                              {s.taskTitle}
                            </span>
                            <span className="badge bg-amber-100 text-amber-800 text-[10px]">
                              Was due: {s.currentDueDate || 'Overdue'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <ArrowRight className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                            <span className="text-gray-500">Suggested:</span>
                            <input
                              type="date"
                              value={s.suggestedDueDate}
                              onChange={(e) => {
                                const copy = [...rescheduleData.suggestions];
                                copy[idx].suggestedDueDate = e.target.value;
                                setRescheduleData({ ...rescheduleData, suggestions: copy });
                              }}
                              className="input-field py-1 px-2 text-xs w-auto font-medium"
                            />
                            <input
                              type="time"
                              value={s.suggestedDueTime || '11:00'}
                              onChange={(e) => {
                                const copy = [...rescheduleData.suggestions];
                                copy[idx].suggestedDueTime = e.target.value;
                                setRescheduleData({ ...rescheduleData, suggestions: copy });
                              }}
                              className="input-field py-1 px-2 text-xs w-auto font-medium"
                            />
                          </div>

                          <p className="text-[11px] text-gray-500 italic pl-5">
                            💡 {s.reason}
                          </p>
                        </div>
                      ))}

                      {/* Action button */}
                      <div className="pt-2 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={loadRescheduleSuggestions}
                          className="btn-secondary py-2.5 px-4 text-xs"
                        >
                          Refresh Suggestions
                        </button>

                        <button
                          type="button"
                          onClick={handleApplyReschedule}
                          disabled={applyingReschedule}
                          className="btn-primary py-2.5 px-6 gap-2 flex-1 justify-center text-sm shadow-md"
                        >
                          {applyingReschedule ? (
                            <span>Applying Reschedule...</span>
                          ) : (
                            <>
                              <CalendarClock className="w-4 h-4" />
                              <span>Apply Rescheduled Dates</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-gray-400">
                      No overdue tasks to reschedule. Great job staying organized!
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center space-y-3">
                  <button
                    type="button"
                    onClick={loadRescheduleSuggestions}
                    className="btn-primary py-2.5 px-6 text-xs gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span>Scan & Suggest Reschedule</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUTOMATIC AI SCHEDULE (COMING SOON) */}
          {activeTab === 'auto-schedule' && (
            <AutoScheduleComingSoon onExploreOther={() => setActiveTab('plan')} />
          )}
        </div>
      </div>
    </div>
  );
}
