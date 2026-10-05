import { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, Plus, ChevronDown, X } from 'lucide-react';
import { Task, TaskFilters, Category } from '../types';
import { taskService } from '../services/task.service';
import { categoryService } from '../services/category.service';
import { useToastContext } from '../context/ToastContext';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';

const STATUS_FILTERS = [
  { value: 'ALL',         label: 'All'         },
  { value: 'TODO',        label: 'To Do'       },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED',   label: 'Completed'   },
  { value: 'OVERDUE',     label: 'Overdue'     },
];

const PRIORITY_FILTERS = [
  { value: 'ALL',    label: 'All Priorities' },
  { value: 'URGENT', label: 'Urgent'         },
  { value: 'HIGH',   label: 'High'           },
  { value: 'MEDIUM', label: 'Medium'         },
  { value: 'LOW',    label: 'Low'            },
];

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest first'          },
  { value: 'createdAt-asc',  label: 'Oldest first'          },
  { value: 'dueDate-asc',    label: 'Due date (earliest)'   },
  { value: 'dueDate-desc',   label: 'Due date (latest)'     },
  { value: 'priority-asc',   label: 'Priority (high first)' },
];

export default function TasksPage() {
  const { toast } = useToastContext();

  const [tasks,          setTasks]          = useState<Task[]>([]);
  const [categories,     setCategories]     = useState<Category[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showModal,      setShowModal]      = useState(false);
  const [showFilters,    setShowFilters]    = useState(false);
  const [total,          setTotal]          = useState(0);

  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortValue,      setSortValue]      = useState('createdAt-desc');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');

  const activeFiltersCount = [
    statusFilter   !== 'ALL',
    priorityFilter !== 'ALL',
    categoryFilter !== 'ALL',
    dateFrom,
    dateTo,
  ].filter(Boolean).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sortBy, sortOrder] = sortValue.split('-') as [TaskFilters['sortBy'], 'asc' | 'desc'];
      const result = await taskService.getTasks({
        search:     search         || undefined,
        status:     statusFilter   !== 'ALL' ? (statusFilter   as TaskFilters['status'])   : undefined,
        priority:   priorityFilter !== 'ALL' ? (priorityFilter as TaskFilters['priority']) : undefined,
        categoryId: categoryFilter !== 'ALL' ? categoryFilter  : undefined,
        dateFrom:   dateFrom       || undefined,
        dateTo:     dateTo         || undefined,
        sortBy, sortOrder,
      });
      setTasks(result.tasks);
      setTotal(result.pagination.total);
    } catch {
      toast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, categoryFilter, sortValue, dateFrom, dateTo, toast]);

  useEffect(() => { categoryService.getCategories().then(setCategories).catch(() => {}); }, []);
  useEffect(() => { const id = setTimeout(load, 300); return () => clearTimeout(id); }, [load]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener('task-created', h);
    return () => window.removeEventListener('task-created', h);
  }, [load]);

  function handleUpdate(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }
  function handleDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setTotal((prev) => prev - 1);
  }
  function clearFilters() {
    setStatusFilter('ALL'); setPriorityFilter('ALL');
    setCategoryFilter('ALL'); setDateFrom(''); setDateTo('');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 animate-fade-in w-full min-w-0">

      {/* ── Search row ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        {/* Search — full width on mobile */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            className="input-field pl-9 pr-9"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center
                         text-gray-400 hover:text-gray-600 rounded touch-manipulation"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Controls row — filter toggle, sort, add */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary relative flex-1 sm:flex-none ${
              showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : ''
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary-600 text-white text-[10px] rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Sort select */}
          <div className="relative flex-1 sm:flex-none">
            <select
              className="input-field appearance-none pr-8 cursor-pointer w-full sm:w-auto"
              value={sortValue}
              onChange={(e) => setSortValue(e.target.value)}
              aria-label="Sort tasks"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <button onClick={() => setShowModal(true)} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>
      </div>

      {/* ── Status filter chips — horizontally scrollable ─────────────────── */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}   /* hide scrollbar on Firefox */
      >
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={[
              'px-3 py-1.5 min-h-[36px] rounded-lg text-sm font-medium whitespace-nowrap',
              'transition-colors touch-manipulation shrink-0',
              statusFilter === f.value
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Advanced filters panel ───────────────────────────────────────── */}
      {showFilters && (
        <div className="card p-4 animate-fade-in">
          {/* 1 col on mobile → 2 on sm → 4 on lg */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="label">Priority</label>
              <select className="input-field" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                {PRIORITY_FILTERS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input-field" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="ALL">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">From Date</label>
              <input type="date" className="input-field" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">To Date</label>
              <input type="date" className="input-field" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="mt-3 flex justify-end">
              <button onClick={clearFilters} className="text-sm text-red-500 hover:underline touch-manipulation">
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-gray-500">
        {loading ? 'Loading…' : `${total} task${total !== 1 ? 's' : ''} found`}
      </p>

      {/* ── Task list ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card p-10 sm:p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-900 font-medium">No tasks found</p>
          <p className="text-gray-500 text-sm mt-1">
            {search || activeFiltersCount > 0
              ? 'Try adjusting your search or filters'
              : 'Create your first task to get started'}
          </p>
          {!search && activeFiltersCount === 0 && (
            <button onClick={() => setShowModal(true)} className="btn-primary mt-4 mx-auto">
              <Plus className="w-4 h-4" /> Create Task
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <TaskModal
          onClose={() => setShowModal(false)}
          onSuccess={(t) => { setShowModal(false); setTasks((p) => [t, ...p]); setTotal((p) => p + 1); }}
        />
      )}
    </div>
  );
}
