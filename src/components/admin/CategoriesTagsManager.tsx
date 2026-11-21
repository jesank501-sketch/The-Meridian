import React, { useState } from 'react';
import { Edit3, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import {
  removeCategory,
  removeTag,
  saveCategory,
  saveTag,
} from '../../lib/firestoreService';
import { slugify } from '../../lib/sanitize';
import { MediaPickerModal } from './MediaLibraryManager';
import type { Category, Tag } from '../../types/portal';

export function CategoriesTagsManager({ mode }: { mode: 'categories' | 'tags' }) {
  const { categories, tags, currentUser, isEditor } = usePortal();
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);
  const [editingTag, setEditingTag] = useState<Partial<Tag> | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  if (!isEditor) {
    return (
      <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm text-stone-600 dark:text-stone-400">
        Editor, Administrator, or Super Admin role is required to manage categories and tags.
      </div>
    );
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !currentUser) return;
    setSaving(true);
    try {
      await saveCategory(
        {
          id: editingCat.id,
          name: editingCat.name || 'Untitled',
          slug: editingCat.slug || slugify(editingCat.name || 'untitled'),
          description: editingCat.description || '',
          imageUrl: editingCat.imageUrl || '',
          parentId: editingCat.parentId || '',
          order: Number(editingCat.order) || categories.length + 1,
          isActive: editingCat.isActive ?? true,
        },
        currentUser
      );
      setEditingCat(null);
      setMsg('Category saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag || !currentUser) return;
    setSaving(true);
    try {
      await saveTag(
        {
          id: editingTag.id,
          name: editingTag.name || 'Tag',
          slug: editingTag.slug || slugify(editingTag.name || 'tag'),
          description: editingTag.description || '',
        },
        currentUser
      );
      setEditingTag(null);
      setMsg('Tag saved.');
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'tags') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tags Manager</h1>
            <p className="text-xs text-stone-500 mt-1">Organize cross-section topics and trends.</p>
          </div>
          <button
            type="button"
            onClick={() => setEditingTag({ name: '', slug: '', description: '' })}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
          >
            <Plus className="w-4 h-4" /> Add Tag
          </button>
        </div>

        {msg && <p className="text-xs text-emerald-600">{msg}</p>}

        {editingTag && (
          <form
            onSubmit={handleSaveTag}
            className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg space-y-4 max-w-lg"
          >
            <h2 className="text-sm font-bold">{editingTag.id ? 'Edit Tag' : 'Create Tag'}</h2>
            <div>
              <label className="block text-xs font-medium mb-1">Tag Name</label>
              <input
                type="text"
                required
                value={editingTag.name || ''}
                onChange={(e) =>
                  setEditingTag({
                    ...editingTag,
                    name: e.target.value,
                    slug: editingTag.id ? editingTag.slug : slugify(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">URL Slug</label>
              <input
                type="text"
                required
                value={editingTag.slug || ''}
                onChange={(e) => setEditingTag({ ...editingTag, slug: slugify(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Description</label>
              <input
                type="text"
                value={editingTag.description || ''}
                onChange={(e) => setEditingTag({ ...editingTag, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
              >
                {saving ? 'Saving...' : 'Save Tag'}
              </button>
              <button
                type="button"
                onClick={() => setEditingTag(null)}
                className="px-4 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {tags.map((t) => (
                <tr key={t.id}>
                  <td className="py-3 px-4 font-medium">{t.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-stone-500">{t.slug}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">{t.description || '—'}</td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingTag(t)}
                      className="p-1.5 text-stone-600 hover:text-stone-900 dark:text-stone-400"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => currentUser && removeTag(t.id, t.name, currentUser)}
                      className="p-1.5 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories & Subcategories</h1>
          <p className="text-xs text-stone-500 mt-1">
            Control newspaper sections, order, URLs, and category imagery.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditingCat({
              name: '',
              slug: '',
              description: '',
              imageUrl: '',
              parentId: '',
              order: categories.length + 1,
              isActive: true,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {msg && <p className="text-xs text-emerald-600">{msg}</p>}

      {editingCat && (
        <form
          onSubmit={handleSaveCategory}
          className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg space-y-4"
        >
          <h2 className="text-base font-bold">
            {editingCat.id ? 'Edit Category' : 'Create Category'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Category Name</label>
              <input
                type="text"
                required
                value={editingCat.name || ''}
                onChange={(e) =>
                  setEditingCat({
                    ...editingCat,
                    name: e.target.value,
                    slug: editingCat.id ? editingCat.slug : slugify(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Category URL Slug</label>
              <input
                type="text"
                required
                value={editingCat.slug || ''}
                onChange={(e) => setEditingCat({ ...editingCat, slug: slugify(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Parent Category (Optional Subcategory)</label>
              <select
                value={editingCat.parentId || ''}
                onChange={(e) => setEditingCat({ ...editingCat, parentId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              >
                <option value="">None (Top-Level Section)</option>
                {categories
                  .filter((c) => c.id !== editingCat.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Display Order</label>
              <input
                type="number"
                min={0}
                value={editingCat.order ?? 1}
                onChange={(e) => setEditingCat({ ...editingCat, order: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 tabular-nums"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">Category Cover Image</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingCat.imageUrl || ''}
                  onChange={(e) => setEditingCat({ ...editingCat, imageUrl: e.target.value })}
                  placeholder="https://... or select from Media Library"
                  className="flex-1 px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                />
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded"
                >
                  <ImageIcon className="w-4 h-4" /> Media
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">Description</label>
              <textarea
                rows={2}
                value={editingCat.description || ''}
                onChange={(e) => setEditingCat({ ...editingCat, description: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={editingCat.isActive ?? true}
              onChange={(e) => setEditingCat({ ...editingCat, isActive: e.target.checked })}
            />
            Active on public website
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
            >
              {saving ? 'Saving...' : 'Save Category'}
            </button>
            <button
              type="button"
              onClick={() => setEditingCat(null)}
              className="px-4 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500">
            <tr>
              <th className="py-3 px-4">Order</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Slug</th>
              <th className="py-3 px-4">Parent</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {categories.map((cat) => {
              const parent = categories.find((c) => c.id === cat.parentId);
              return (
                <tr key={cat.id}>
                  <td className="py-3 px-4 font-mono tabular-nums text-xs">{cat.order}</td>
                  <td className="py-3 px-4 font-medium">{cat.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-stone-500">/category/{cat.slug}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">{parent?.name || '—'}</td>
                  <td className="py-3 px-4 text-xs">
                    <span className={cat.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400'}>
                      {cat.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingCat(cat)}
                      className="p-1.5 text-stone-600 hover:text-stone-900 dark:text-stone-400"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => currentUser && removeCategory(cat.id, cat.name, currentUser)}
                      className="p-1.5 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onSelect={(asset) => setEditingCat((prev) => (prev ? { ...prev, imageUrl: asset.url } : prev))}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
