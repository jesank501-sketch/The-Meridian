import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { useRouter } from '../../lib/router';
import { trackPageView } from '../../lib/firestoreService';
import { NewsCard } from './NewsCard';
import { PublicSidebar } from './PublicSidebar';

export function ArchiveAndSearchPage({
  mode,
  slug,
}: {
  mode: 'category' | 'tag' | 'search';
  slug?: string;
}) {
  const { publishedArticles, categories, publishedDesign } = usePortal();
  const { query, navigate } = useRouter();
  const initialQ = query.get('q') || '';
  const [searchInput, setSearchInput] = useState(initialQ);
  const [page, setPage] = useState(1);
  const perPage = 6;

  useEffect(() => {
    setSearchInput(query.get('q') || '');
    setPage(1);
  }, [mode, slug, query.get('q')]);

  useEffect(() => {
    trackPageView(window.location.pathname);
  }, [mode, slug]);

  const category = mode === 'category' ? categories.find((c) => c.slug === slug) : null;

  const filtered = publishedArticles.filter((art) => {
    if (mode === 'category') {
      return art.categorySlug === slug;
    }
    if (mode === 'tag') {
      const target = decodeURIComponent(slug || '').toLowerCase();
      return (art.tagNames || []).some(
        (t) => t.toLowerCase().replace(/\s+/g, '-') === target || t.toLowerCase() === target
      );
    }
    const q = (query.get('q') || '').trim().toLowerCase();
    if (!q) return true;
    return (
      art.title.toLowerCase().includes(q) ||
      art.excerpt.toLowerCase().includes(q) ||
      art.categoryName.toLowerCase().includes(q) ||
      art.authorName.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const headingTitle =
    mode === 'category'
      ? category?.name || (slug || 'Section').replace(/-/g, ' ')
      : mode === 'tag'
      ? `Topic: ${decodeURIComponent(slug || '').replace(/-/g, ' ')}`
      : query.get('q')
      ? `Search Results for "${query.get('q')}"`
      : 'Search Archive';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="border-b border-stone-200 dark:border-stone-800 pb-6 mb-8">
        <h1 className="font-editorial-heading text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-50 capitalize">
          {headingTitle}
        </h1>
        {category?.description && (
          <p className="mt-2 text-stone-600 dark:text-stone-400 max-w-2xl">
            {category.description}
          </p>
        )}

        {mode === 'search' && (
          <form onSubmit={handleSearch} className="mt-4 flex items-center gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search articles, authors, or topics..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white rounded"
              style={{ backgroundColor: publishedDesign.theme.primaryColor }}
            >
              Search
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          {paginated.length === 0 ? (
            <div className="p-10 border border-stone-200 dark:border-stone-800 rounded text-center">
              <p className="font-editorial-heading text-xl font-bold text-stone-900 dark:text-stone-100 mb-2">
                No matching dispatches
              </p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Try broadening your search terms or browsing another section.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {paginated.map((art) => (
                  <NewsCard key={art.id} article={art} layoutOverride="grid" />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-10 pt-6 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <span className="text-xs text-stone-500 tabular-nums">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded disabled:opacity-40"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="lg:col-span-4">
          <PublicSidebar />
        </div>
      </div>
    </main>
  );
}
