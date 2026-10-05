import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Check, X, Loader2, Tag } from 'lucide-react';
import { Category } from '../types';
import { categoryService } from '../services/category.service';
import { useToastContext } from '../context/ToastContext';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280', '#14b8a6', '#f59e0b', '#84cc16',
];

export default function CategoriesPage() {
  const { toast } = useToastContext();

  const [categories,  setCategories]  = useState<Category[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [editId,      setEditId]      = useState<string | null>(null);

  const [formName,    setFormName]    = useState('');
  const [formColor,   setFormColor]   = useState('#6366f1');
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await categoryService.getCategories());
    } catch {
      toast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  function startEdit(cat: Category) {
    setEditId(cat.id); setFormName(cat.name); setFormColor(cat.color); setShowCreate(false);
  }
  function cancelEdit() {
    setEditId(null); setFormName(''); setFormColor('#6366f1');
  }
  function startCreate() {
    setShowCreate(true); setEditId(null); setFormName(''); setFormColor('#6366f1');
  }

  async function handleCreate() {
    if (!formName.trim()) return;
    setFormLoading(true);
    try {
      const cat = await categoryService.createCategory({ name: formName.trim(), color: formColor });
      setCategories((p) => [...p, cat]);
      setShowCreate(false); setFormName('');
      toast('Category created', 'success');
    } catch (err: unknown) {
      toast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create category', 'error');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!formName.trim()) return;
    setFormLoading(true);
    try {
      const updated = await categoryService.updateCategory(id, { name: formName.trim(), color: formColor });
      setCategories((p) => p.map((c) => (c.id === id ? updated : c)));
      setEditId(null);
      toast('Category updated', 'success');
    } catch (err: unknown) {
      toast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update category', 'error');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? Tasks will be uncategorized.`)) return;
    try {
      await categoryService.deleteCategory(id);
      setCategories((p) => p.filter((c) => c.id !== id));
      toast('Category deleted', 'info');
    } catch {
      toast('Failed to delete category', 'error');
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in w-full min-w-0">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{categories.length} categories</p>
        <button onClick={startCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Category
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <CategoryForm
          name={formName} color={formColor} loading={formLoading}
          onNameChange={setFormName} onColorChange={setFormColor}
          onSave={handleCreate} onCancel={() => setShowCreate(false)}
          title="New Category"
        />
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : categories.length === 0 ? (
        <div className="card p-10 sm:p-12 text-center">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-900 font-medium">No categories yet</p>
          <p className="text-gray-500 text-sm mt-1">Create categories to organize your tasks</p>
        </div>
      ) : (
        /* 1 col on mobile, 2 cols on sm+ */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <div key={cat.id}>
              {editId === cat.id ? (
                <CategoryForm
                  name={formName} color={formColor} loading={formLoading}
                  onNameChange={setFormName} onColorChange={setFormColor}
                  onSave={() => handleUpdate(cat.id)} onCancel={cancelEdit}
                  title="Edit Category"
                />
              ) : (
                <div className="card p-4 flex items-center gap-3 sm:gap-4 min-w-0">
                  {/* Color swatch */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-base shrink-0"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.name[0]?.toUpperCase()}
                  </div>

                  {/* Name + task count */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{cat.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {cat._count?.tasks ?? 0} task{(cat._count?.tasks ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Actions — always visible, min 44px tap target */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => startEdit(cat)}
                      className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors touch-manipulation"
                      aria-label={`Edit ${cat.name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors touch-manipulation"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── CategoryForm ─────────────────────────────────────────────────────────── */
interface CategoryFormProps {
  name: string; color: string; loading: boolean;
  onNameChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onSave: () => void; onCancel: () => void; title: string;
}

function CategoryForm({ name, color, loading, onNameChange, onColorChange, onSave, onCancel, title }: CategoryFormProps) {
  return (
    <div className="card p-4 border-primary-200 animate-fade-in">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>

      <div className="flex gap-2 mb-3">
        <div
          className="w-10 h-10 rounded-lg shrink-0 border-2 border-dashed border-gray-200"
          style={{ backgroundColor: color }}
        />
        <input
          type="text"
          className="input-field flex-1 min-w-0"
          placeholder="Category name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
        />
      </div>

      {/* Color swatches — larger tap targets on mobile */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className="w-8 h-8 sm:w-6 sm:h-6 rounded-full transition-transform hover:scale-110 focus:outline-none touch-manipulation flex items-center justify-center"
            style={{ backgroundColor: c }}
            aria-label={`Select color ${c}`}
          >
            {color === c && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </button>
        ))}
        <input
          type="color"
          className="w-8 h-8 sm:w-6 sm:h-6 rounded-full cursor-pointer border-0 bg-transparent touch-manipulation"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          title="Custom color"
        />
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-secondary flex-1 justify-center">
          <X className="w-4 h-4" /> Cancel
        </button>
        <button onClick={onSave} disabled={loading || !name.trim()} className="btn-primary flex-1 justify-center">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save
        </button>
      </div>
    </div>
  );
}
