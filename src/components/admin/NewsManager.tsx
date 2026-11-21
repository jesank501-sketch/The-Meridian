import React, { useState } from 'react';
import { Edit3, ExternalLink, PlusCircle, Search, Trash2 } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { removeArticle, saveArticle } from '../../lib/firestoreService';
import { formatFirestoreDate } from '../../lib/sanitize';
import { Link } from '../../lib/router';
import type { NewsArticle } from '../../types/portal';

interface NewsManagerProps {
  presetFilter?: 'all' | 'breaking' | 'featured' | 'trending';
  onEditArticle: (article: NewsArticle) => void;
  onCreateNew: () => void;
}

export function NewsManager({
  presetFilter = 'all',
  onEditArticle,
  onCreateNew,
}: NewsManagerProps) {
  const { articles, currentUser, isEditor } = usePortal();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = articles.filter((a) => {
    if (presetFilter === 'breaking' && !a.isBreaking) return false;
    if (presetFilter === 'featured' && !a.isFeatured) return false;
    if (presetFilter === 'trending' && !a.isTrending) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      a.title.toLowerCase().includes(q) ||
      a.categoryName.toLowerCase().includes(q) ||
      a.authorName.toLowerCase().includes(q)
    );
  });

  const toggleFlag = async (
    article: NewsArticle,
    flag: 'isBreaking' | 'isFeatured' | 'isTrending'
  ) => {
    if (!currentUser) return;
    if (!isEditor && article.authorId !== currentUser.uid) return;
    setBusyId(article.id);
    try {
      await saveArticle({ ...article, [flag]: !article[flag] }, currentUser);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (article: NewsArticle) => {
    if (!currentUser) return;
    setBusyId(article.id);
    try {
      await removeArticle(article.id, article.title, currentUser);
    } finally {
      setBusyId(null);
    }
  };

  const titleLabel =
    presetFilter === 'breaking'
      ? 'Breaking News Desk'
      : presetFilter === 'featured'
      ? 'Featured Stories'
      : presetFilter === 'trending'
      ? 'Trending Dispatches'
      : 'All News Articles';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{titleLabel}</h1>
          <p className="text-xs text-stone-500 mt-1">
            {filtered.length} article{filtered.length === 1 ? '' : 's'} matching current view.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded hover:opacity-90"
        >
          <PlusCircle className="w-4 h-4" /> Add New News
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by headline, category, or author..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500">
            <tr>
              <th className="py-3 px-4">Headline</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Flags</th>
              <th className="py-3 px-4 text-right">Views</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {filtered.map((art) => {
              const canEdit = isEditor || art.authorId === currentUser?.uid;
              return (
                <tr key={art.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40">
                  <td className="py-3 px-4 max-w-md">
                    <p className="font-semibold text-stone-900 dark:text-stone-100 line-clamp-1">
                      {art.title}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      By {art.authorName} · {formatFirestoreDate(art.publishedAt || art.createdAt)}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-xs text-stone-600 dark:text-stone-300 whitespace-nowrap">
                    {art.categoryName}
                  </td>
                  <td className="py-3 px-4 text-xs whitespace-nowrap">
                    <span
                      className={`font-semibold capitalize ${
                        art.status === 'published'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : art.status === 'scheduled'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-stone-500'
                      }`}
                    >
                      {art.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        disabled={!canEdit || busyId === art.id}
                        onClick={() => toggleFlag(art, 'isBreaking')}
                        className={`px-2 py-0.5 rounded border ${
                          art.isBreaking
                            ? 'bg-red-700 text-white border-red-700'
                            : 'border-stone-300 dark:border-stone-700 text-stone-500'
                        }`}
                      >
                        Breaking
                      </button>
                      <button
                        type="button"
                        disabled={!canEdit || busyId === art.id}
                        onClick={() => toggleFlag(art, 'isFeatured')}
                        className={`px-2 py-0.5 rounded border ${
                          art.isFeatured
                            ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900'
                            : 'border-stone-300 dark:border-stone-700 text-stone-500'
                        }`}
                      >
                        Featured
                      </button>
                      <button
                        type="button"
                        disabled={!canEdit || busyId === art.id}
                        onClick={() => toggleFlag(art, 'isTrending')}
                        className={`px-2 py-0.5 rounded border ${
                          art.isTrending
                            ? 'bg-amber-700 text-white border-amber-700'
                            : 'border-stone-300 dark:border-stone-700 text-stone-500'
                        }`}
                      >
                        Trending
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                    {(art.viewsCount || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                    <Link
                      to={`/news/${art.slug}`}
                      className="inline-flex p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
                      ariaLabel="View article"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditArticle(art)}
                          className="p-1.5 text-stone-600 hover:text-stone-900 dark:text-stone-400"
                          title="Edit article"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busyId === art.id}
                          onClick={() => handleDelete(art)}
                          className="p-1.5 text-red-600 hover:text-red-800"
                          title="Delete article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
