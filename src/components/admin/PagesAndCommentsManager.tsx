import React, { useState } from 'react';
import { Check, Download, Edit3, Plus, Trash2, X } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import {
  moderateComment,
  removeComment,
  removeCustomPage,
  removeSubscriber,
  saveCustomPage,
  updateSubscriberStatus,
} from '../../lib/firestoreService';
import { formatFirestoreDate, slugify } from '../../lib/sanitize';
import { RichTextEditor } from '../common/RichTextEditor';
import type { CustomPage } from '../../types/portal';

export function PagesAndCommentsManager({
  mode,
}: {
  mode: 'pages' | 'comments' | 'newsletter';
}) {
  const { pages, comments, subscribers, currentUser, isEditor, isAdmin } = usePortal();
  const [editingPage, setEditingPage] = useState<Partial<CustomPage> | null>(null);
  const [busy, setBusy] = useState(false);

  if (mode === 'newsletter') {
    if (!isAdmin) {
      return (
        <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm">
          Administrator or Super Admin role is required to view subscriber emails.
        </div>
      );
    }

    const exportCsv = () => {
      const rows = [
        ['Email', 'Name', 'Status', 'Subscribed Date'],
        ...subscribers.map((s) => [
          s.email,
          s.name || '',
          s.status,
          formatFirestoreDate(s.subscribedAt),
        ]),
      ];
      const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meridian-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Newsletter Manager</h1>
            <p className="text-xs text-stone-500 mt-1">
              {subscribers.length} total subscribers · Strictly isolated from public access.
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500">
              <tr>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Subscribed</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {subscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-stone-500">
                    No newsletter subscribers yet.
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-3 px-4 font-medium">{sub.email}</td>
                    <td className="py-3 px-4 text-xs text-stone-500">{sub.name || '—'}</td>
                    <td className="py-3 px-4 text-xs capitalize">{sub.status}</td>
                    <td className="py-3 px-4 text-xs text-stone-500">
                      {formatFirestoreDate(sub.subscribedAt)}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() =>
                          currentUser &&
                          updateSubscriberStatus(
                            sub.id,
                            sub.status === 'active' ? 'unsubscribed' : 'active',
                            currentUser
                          )
                        }
                        className="text-xs underline text-stone-600 dark:text-stone-300"
                      >
                        {sub.status === 'active' ? 'Unsubscribe' : 'Reactivate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => currentUser && removeSubscriber(sub.id, currentUser)}
                        className="p-1 text-red-600"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (mode === 'comments') {
    if (!isEditor) {
      return (
        <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm">
          Editor or higher permissions are required to moderate reader comments.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Comments Moderation</h1>
          <p className="text-xs text-stone-500 mt-1">
            Review, approve, or reject reader comments before they appear on published articles.
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg divide-y divide-stone-200 dark:divide-stone-800">
          {comments.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">No reader comments yet.</div>
          ) : (
            comments.map((cmt) => (
              <div key={cmt.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {cmt.authorName}
                    </span>
                    <span className="text-stone-400">·</span>
                    <span className="text-stone-500">{cmt.newsTitle || cmt.newsId}</span>
                    <span className="text-stone-400">·</span>
                    <span
                      className={`font-semibold capitalize ${
                        cmt.status === 'approved'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : cmt.status === 'rejected'
                          ? 'text-red-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {cmt.status}
                    </span>
                  </div>
                  <p className="text-sm text-stone-700 dark:text-stone-300">{cmt.content}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => currentUser && moderateComment(cmt.id, 'approved', currentUser)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-700 text-white rounded"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => currentUser && moderateComment(cmt.id, 'rejected', currentUser)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => currentUser && removeComment(cmt.id, currentUser)}
                    className="p-1.5 text-red-600 border border-stone-300 dark:border-stone-700 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Pages Manager
  if (!isEditor) {
    return (
      <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm">
        Editor or higher permissions are required to manage static and custom pages.
      </div>
    );
  }

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage || !currentUser) return;
    setBusy(true);
    try {
      await saveCustomPage(
        {
          id: editingPage.id,
          title: editingPage.title || 'Untitled Page',
          slug: editingPage.slug || slugify(editingPage.title || 'page'),
          contentHtml: editingPage.contentHtml || '<p></p>',
          seoTitle: editingPage.seoTitle || editingPage.title || '',
          seoDescription: editingPage.seoDescription || '',
          status: editingPage.status || 'published',
          showInFooter: editingPage.showInFooter ?? true,
        },
        currentUser
      );
      setEditingPage(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pages Manager</h1>
          <p className="text-xs text-stone-500 mt-1">
            Create and edit About Us, Privacy Policy, Terms & Conditions, and unlimited custom pages.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditingPage({
              title: '',
              slug: '',
              contentHtml: '<p></p>',
              status: 'published',
              showInFooter: true,
            })
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
        >
          <Plus className="w-4 h-4" /> New Custom Page
        </button>
      </div>

      {editingPage && (
        <form
          onSubmit={handleSavePage}
          className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium mb-1">Page Title</label>
              <input
                type="text"
                required
                value={editingPage.title || ''}
                onChange={(e) =>
                  setEditingPage({
                    ...editingPage,
                    title: e.target.value,
                    slug: editingPage.id ? editingPage.slug : slugify(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">URL Slug (/page/...)</label>
              <input
                type="text"
                required
                value={editingPage.slug || ''}
                onChange={(e) => setEditingPage({ ...editingPage, slug: slugify(e.target.value) })}
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 font-mono"
              />
            </div>
          </div>

          <RichTextEditor
            value={editingPage.contentHtml || '<p></p>'}
            onChange={(html) => setEditingPage({ ...editingPage, contentHtml: html })}
          />

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <select
                value={editingPage.status || 'published'}
                onChange={(e) =>
                  setEditingPage({
                    ...editingPage,
                    status: e.target.value as 'published' | 'draft',
                  })
                }
                className="px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <label className="inline-flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={editingPage.showInFooter ?? true}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, showInFooter: e.target.checked })
                  }
                />
                Show link in Footer
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingPage(null)}
                className="px-4 py-2 border border-stone-300 dark:border-stone-700 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
              >
                {busy ? 'Saving...' : 'Save Page'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500">
            <tr>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4">URL</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {pages.map((pg) => (
              <tr key={pg.id}>
                <td className="py-3 px-4 font-medium">{pg.title}</td>
                <td className="py-3 px-4 font-mono text-xs text-stone-500">/page/{pg.slug}</td>
                <td className="py-3 px-4 text-xs capitalize">{pg.status}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button type="button" onClick={() => setEditingPage(pg)} className="p-1.5 text-stone-600">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => currentUser && removeCustomPage(pg.id, currentUser)}
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
