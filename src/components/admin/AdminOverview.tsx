import React from 'react';
import {
  Eye,
  FileText,
  FolderOpen,
  MessageSquare,
  PlusCircle,
  Users,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { formatFirestoreDate } from '../../lib/sanitize';

export function AdminOverview({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  const {
    articles,
    categories,
    users,
    analyticsEvents,
    activityLogs,
    comments,
    subscribers,
  } = usePortal();

  const publishedCount = articles.filter((a) => a.status === 'published').length;
  const draftCount = articles.filter((a) => a.status === 'draft').length;
  const totalArticleViews = articles.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
  const pendingComments = comments.filter((c) => c.status === 'pending').length;

  const todayKey = new Date().toISOString().slice(0, 10);
  const dailyVisitors = new Set(
    analyticsEvents.filter((e) => e.dateKey === todayKey).map((e) => e.visitorId)
  ).size;

  const topArticles = [...articles]
    .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
    .slice(0, 5);

  const stats = [
    { label: 'Published Articles', value: publishedCount, icon: FileText, tab: 'all-news' },
    { label: 'Editorial Drafts', value: draftCount, icon: FileText, tab: 'all-news' },
    { label: 'Categories', value: categories.length, icon: FolderOpen, tab: 'categories' },
    { label: 'Registered Users', value: users.length || 1, icon: Users, tab: 'users' },
    { label: 'Total Article Reads', value: totalArticleViews + analyticsEvents.length, icon: Eye, tab: 'analytics' },
    { label: 'Today Unique Visitors', value: dailyVisitors, icon: Eye, tab: 'analytics' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">
            Newsroom Dashboard
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Real-time editorial inventory, reader telemetry, and recent newsroom activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('add-news')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded hover:opacity-90 whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" /> New Article
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('ads')}
            className="px-4 py-2 text-xs font-semibold border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap shrink-0"
          >
            Ads & Direct Links
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('homepage-builder')}
            className="px-4 py-2 text-xs font-semibold border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap shrink-0"
          >
            Open Visual Builder
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((st) => {
          const Icon = st.icon;
          return (
            <button
              key={st.label}
              type="button"
              onClick={() => onNavigateTab(st.tab)}
              className="text-left p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
            >
              <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 mb-2">
                <span className="text-xs font-medium">{st.label}</span>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
                {st.value.toLocaleString()}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Popular Articles */}
        <div className="lg:col-span-7 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Most Popular Articles
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('analytics')}
              className="text-xs text-stone-500 hover:underline"
            >
              Full Analytics
            </button>
          </div>
          <div className="divide-y divide-stone-200 dark:divide-stone-800">
            {topArticles.map((art) => (
              <div key={art.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                    {art.title}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {art.categoryName} · {art.authorName}
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-stone-700 dark:text-stone-300 shrink-0">
                  {(art.viewsCount || 0).toLocaleString()} views
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Moderation & Activity Summary */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5">
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">
              Editorial Queues
            </h2>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100 dark:border-stone-800">
                <span className="inline-flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
                  <MessageSquare className="w-3.5 h-3.5" /> Comments Awaiting Moderation
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('comments')}
                  className="font-bold tabular-nums underline"
                >
                  {pendingComments}
                </button>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-stone-600 dark:text-stone-300">
                  Newsletter Subscribers
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('newsletter')}
                  className="font-bold tabular-nums underline"
                >
                  {subscribers.length}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5">
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-3">
              Recent Activity Logs
            </h2>
            {activityLogs.length === 0 ? (
              <p className="text-xs text-stone-500">No recorded editorial logs yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {activityLogs.slice(0, 6).map((log) => (
                  <li key={log.id} className="text-xs border-b border-stone-100 dark:border-stone-800 pb-2 last:border-b-0">
                    <p className="font-medium text-stone-800 dark:text-stone-200">{log.details}</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {log.userName} ({log.userRole}) · {formatFirestoreDate(log.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
