import React, { useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import {
  removeNavMenuItem,
  saveNavMenuItem,
} from '../../lib/firestoreService';
import { AdsManager } from './AdsManager';
import type { NavigationMenuItem } from '../../types/portal';

export function MenusAndAdsManager({ mode }: { mode: 'menus' | 'ads' }) {
  const { navMenus, currentUser, isAdmin } = usePortal();
  const [editingMenu, setEditingMenu] = useState<Partial<NavigationMenuItem> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (!isAdmin) {
    return (
      <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm">
        Administrator or Super Admin role is required to manage navigation menus and advertisements.
      </div>
    );
  }

  if (mode === 'ads') {
    return <AdsManager />;
  }

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenu || !currentUser) return;
    setBusy(true);
    try {
      await saveNavMenuItem(
        {
          id: editingMenu.id,
          label: editingMenu.label || 'Link',
          url: editingMenu.url || '/',
          location: editingMenu.location || 'header',
          order: Number(editingMenu.order) || navMenus.length + 1,
          openInNewTab: Boolean(editingMenu.openInNewTab),
          isActive: editingMenu.isActive ?? true,
        },
        currentUser
      );
      setEditingMenu(null);
      setMsg('Menu item saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menu Manager</h1>
          <p className="text-xs text-stone-500 mt-1">
            Manage navigation links across the top bar, main header, and footer columns.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditingMenu({
              label: '',
              url: '/',
              location: 'header',
              order: navMenus.length + 1,
              isActive: true,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
        >
          <Plus className="w-4 h-4" /> Add Menu Link
        </button>
      </div>

      {msg && <p className="text-xs text-emerald-600">{msg}</p>}

      {editingMenu && (
        <form
          onSubmit={handleSaveMenu}
          className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs"
        >
          <div>
            <label className="block font-medium mb-1">Link Label</label>
            <input
              type="text"
              required
              value={editingMenu.label || ''}
              onChange={(e) => setEditingMenu({ ...editingMenu, label: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Destination URL</label>
            <input
              type="text"
              required
              value={editingMenu.url || ''}
              onChange={(e) => setEditingMenu({ ...editingMenu, url: e.target.value })}
              placeholder="/category/world or https://..."
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Menu Location</label>
            <select
              value={editingMenu.location || 'header'}
              onChange={(e) =>
                setEditingMenu({
                  ...editingMenu,
                  location: e.target.value as NavigationMenuItem['location'],
                })
              }
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            >
              <option value="header">Main Header Navigation</option>
              <option value="topbar">Top Information Bar</option>
              <option value="footer_col1">Footer Column 1</option>
              <option value="footer_col2">Footer Column 2</option>
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Order</label>
            <input
              type="number"
              value={editingMenu.order ?? 1}
              onChange={(e) => setEditingMenu({ ...editingMenu, order: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 tabular-nums"
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={editingMenu.isActive ?? true}
                onChange={(e) => setEditingMenu({ ...editingMenu, isActive: e.target.checked })}
              />
              Active
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingMenu(null)}
                className="px-3 py-2 border border-stone-300 dark:border-stone-700 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
              >
                Save Link
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500">
            <tr>
              <th className="py-3 px-4">Order</th>
              <th className="py-3 px-4">Label</th>
              <th className="py-3 px-4">URL</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {navMenus.map((item) => (
              <tr key={item.id}>
                <td className="py-3 px-4 font-mono tabular-nums text-xs">{item.order}</td>
                <td className="py-3 px-4 font-medium">{item.label}</td>
                <td className="py-3 px-4 font-mono text-xs text-stone-500">{item.url}</td>
                <td className="py-3 px-4 text-xs capitalize">{item.location.replace('_', ' ')}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button type="button" onClick={() => setEditingMenu(item)} className="p-1.5 text-stone-600">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => currentUser && removeNavMenuItem(item.id, currentUser)}
                    className="p-1.5 text-red-600"
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
