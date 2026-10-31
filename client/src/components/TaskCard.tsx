import { useState } from 'react';
import {
  Check,
  Pencil,
  Trash2,
  Clock,
  Calendar,
  Bell,
  RefreshCw,
  AlertCircle,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react';
import { Task, TaskProof } from '../types';
import { taskService } from '../services/task.service';
import { useToastContext } from '../context/ToastContext';
import { useAlarm } from '../context/AlarmContext';
import {
  getPriorityColor,
  getPriorityDot,
  formatDateShort,
  formatTime,
  isToday,
  isOverdue,
  cn,
  truncate,
} from '../utils';
import TaskModal from './TaskModal';
import PhotoCompletionModal from './PhotoCompletionModal';

interface Props {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete: (id: string) => void;
}

export default function TaskCard({ task, onUpdate, onDelete }: Props) {
  const { toast } = useToastContext();
  const { triggerTaskStartAlarm } = useAlarm();
  const [toggling, setToggling] = useState(false);
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPhotoPreview, setShowPhotoPreview] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);

  const isCompleted = task.status === 'COMPLETED';
  const overdueFlag = isOverdue(task.dueDate, task.status);

  // Start task & sound alarm
  async function handleStartTask() {
    setStarting(true);
    try {
      const updated = await taskService.updateStatus(task.id, 'IN_PROGRESS');
      onUpdate(updated);
      triggerTaskStartAlarm(updated);
      toast(`Started "${task.title}"! Alarm sounded.`, 'success');
    } catch {
      toast('Failed to start task', 'error');
    } finally {
      setStarting(false);
    }
  }

  // Checkbox toggle logic
  async function handleCheckboxClick() {
    if (isCompleted) {
      // Uncompleting a task
      setToggling(true);
      try {
        const updated = await taskService.updateStatus(task.id, 'TODO');
        onUpdate(updated);
        toast('Task marked as to-do', 'info');
      } catch {
        toast('Failed to update task', 'error');
      } finally {
        setToggling(false);
      }
    } else {
      // Completing requires photo verification!
      setShowPhotoModal(true);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${task.title}"?`)) return;
    setDeleting(true);
    try {
      await taskService.deleteTask(task.id);
      onDelete(task.id);
      toast('Task deleted', 'info');
    } catch {
      toast('Failed to delete task', 'error');
    } finally {
      setDeleting(false);
    }
  }

  function handlePhotoSuccess(updatedTask: Task) {
    setShowPhotoModal(false);
    onUpdate(updatedTask);
  }

  return (
    <>
      <div
        className={cn(
          'card p-3 sm:p-4 transition-all duration-200 hover:shadow-md w-full min-w-0 group',
          isCompleted && 'opacity-70 bg-gray-50/50',
          overdueFlag && !isCompleted && 'border-red-200 bg-red-50/30'
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          {/* ── Checkbox (Photo-required completion trigger) ─────────────── */}
          <button
            onClick={handleCheckboxClick}
            disabled={toggling}
            aria-label={isCompleted ? 'Mark incomplete' : 'Complete with photo'}
            title={isCompleted ? 'Mark incomplete' : 'Photo verification required to complete'}
            className={cn(
              'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
              'transition-all duration-200 touch-manipulation relative after:absolute after:-inset-2.5',
              isCompleted
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 hover:border-primary-500 hover:bg-primary-50',
              toggling && 'opacity-50 cursor-wait'
            )}
          >
            {isCompleted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </button>

          {/* ── Main Content ────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2 min-w-0">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex-1 text-left min-w-0 touch-manipulation"
                aria-expanded={expanded}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={cn(
                      'text-sm font-medium leading-snug break-words',
                      isCompleted ? 'line-through text-gray-400' : 'text-gray-900'
                    )}
                  >
                    {task.title}
                  </h3>

                  {/* Verification Status Pill */}
                  {task.verificationStatus === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      <span>Verified</span>
                    </span>
                  )}

                  {task.verificationStatus === 'REJECTED' && !isCompleted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPhotoModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full hover:bg-red-100 transition-colors shrink-0"
                    >
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      <span>Photo Rejected — Retake</span>
                    </button>
                  )}

                  {task.status === 'PENDING_VERIFICATION' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                      <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                      <span>Verifying</span>
                    </span>
                  )}
                </div>
              </button>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0 sm:opacity-90 sm:group-hover:opacity-100 sm:transition-opacity">
                {/* Start Task button (if TODO) */}
                {!isCompleted && task.status === 'TODO' && (
                  <button
                    onClick={handleStartTask}
                    disabled={starting}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 transition-colors touch-manipulation border border-emerald-200/60"
                    title="Start task (sounds alarm on your phone)"
                  >
                    <Play className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                    <span>Start</span>
                  </button>
                )}

                {/* Complete with Photo button (if incomplete) */}
                {!isCompleted && (
                  <button
                    onClick={() => setShowPhotoModal(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors touch-manipulation"
                    title="Upload photo to complete task"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Verify</span>
                  </button>
                )}

                <button
                  onClick={() => setShowEdit(true)}
                  className="flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded-md text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors touch-manipulation"
                  aria-label="Edit task"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center justify-center w-8 h-8 sm:w-7 sm:h-7 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors touch-manipulation disabled:opacity-40"
                  aria-label="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <p className="mt-1 text-xs text-gray-500 leading-relaxed break-words">
                {expanded ? task.description : truncate(task.description, 100)}
              </p>
            )}

            {/* Rejection / Feedback Alert */}
            {task.verificationFeedback && task.verificationStatus === 'REJECTED' && !isCompleted && (
              <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">AI Feedback: </span>
                  {task.verificationFeedback}
                </div>
              </div>
            )}

            {/* Verified Photo Preview Button */}
            {task.proofPhotoUrl && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoPreview(true)}
                  className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2 py-1 rounded-md transition-colors"
                >
                  <img
                    src={task.proofPhotoUrl}
                    alt="Proof thumbnail"
                    className="w-4 h-4 rounded object-cover"
                  />
                  <span>View completion photo</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Subtasks Section */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="mt-2 pt-1 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSubtasksExpanded(!subtasksExpanded)}
                  className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-700"
                >
                  {subtasksExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>
                    Subtasks ({task.subtasks.filter((s) => s.status === 'COMPLETED').length}/{task.subtasks.length})
                  </span>
                </button>

                {subtasksExpanded && (
                  <div className="mt-1.5 space-y-1 pl-2">
                    {task.subtasks.map((st) => (
                      <div key={st.id} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                        <span className={cn(st.status === 'COMPLETED' && 'line-through text-gray-400')}>
                          {st.title}
                        </span>
                        {st.estimatedDuration && (
                          <span className="text-[10px] text-gray-400">({st.estimatedDuration}m)</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Metadata chips ─────────────────────────────────────────── */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {/* Priority */}
              <span className={`badge ${getPriorityColor(task.priority)}`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1 shrink-0 ${getPriorityDot(task.priority)}`} />
                {task.priority}
              </span>

              {/* Category */}
              {task.category && (
                <span
                  className="badge text-white text-xs max-w-[120px] truncate"
                  style={{ backgroundColor: task.category.color }}
                  title={task.category.name}
                >
                  {task.category.name}
                </span>
              )}

              {/* Estimated Duration */}
              {task.estimatedDuration && (
                <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span>{task.estimatedDuration}m</span>
                </span>
              )}

              {/* Due date / time */}
              {task.dueDate && (
                <span
                  className={cn(
                    'flex items-center gap-1 text-xs shrink-0',
                    overdueFlag
                      ? 'text-red-500 font-medium'
                      : isToday(task.dueDate)
                        ? 'text-primary-600'
                        : 'text-gray-500'
                  )}
                >
                  {overdueFlag ? (
                    <AlertCircle className="w-3 h-3 shrink-0" />
                  ) : (
                    <Calendar className="w-3 h-3 shrink-0" />
                  )}
                  {isToday(task.dueDate) ? 'Today' : formatDateShort(task.dueDate)}
                  {task.dueTime && (
                    <>
                      <Clock className="w-3 h-3 shrink-0 ml-0.5" />
                      {formatTime(task.dueTime)}
                    </>
                  )}
                </span>
              )}

              {/* Reminder indicator */}
              {(task.reminders?.length ?? 0) > 0 && (
                <span className="text-xs text-gray-400 flex items-center gap-0.5" title="Reminder set">
                  <Bell className="w-3 h-3 shrink-0" />
                </span>
              )}

              {/* Recurring indicator */}
              {task.recurringTask && (
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  <RefreshCw className="w-3 h-3 shrink-0" />
                  <span className="hidden xs:inline">
                    {task.recurringTask.recurrenceType.toLowerCase()}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      {showEdit && (
        <TaskModal
          task={task}
          onClose={() => setShowEdit(false)}
          onSuccess={(updated) => {
            setShowEdit(false);
            onUpdate(updated);
          }}
        />
      )}

      {/* Photo Completion Modal */}
      {showPhotoModal && (
        <PhotoCompletionModal
          task={task}
          onClose={() => setShowPhotoModal(false)}
          onSuccess={handlePhotoSuccess}
        />
      )}

      {/* Photo Lightbox Preview */}
      {showPhotoPreview && task.proofPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowPhotoPreview(false)}
        >
          <div
            className="max-w-xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-xs text-gray-900 truncate">
                Completion Photo for: {task.title}
              </span>
              <button
                onClick={() => setShowPhotoPreview(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center bg-gray-950">
              <img
                src={task.proofPhotoUrl}
                alt="Completion proof"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
            {task.verificationFeedback && (
              <div className="p-3 bg-gray-50 text-xs text-gray-700">
                <span className="font-semibold text-green-700">✓ AI Feedback: </span>
                {task.verificationFeedback}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
