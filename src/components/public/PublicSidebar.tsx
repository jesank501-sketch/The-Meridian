import React, { useState } from 'react';
import { CheckCircle2, Mail } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { Link } from '../../lib/router';
import { subscribeNewsletter } from '../../lib/firestoreService';
import { AdSlot } from '../common/AdSlot';

export function PublicSidebar() {
  const { publishedDesign, publishedArticles, categories } = usePortal();
  const sidebarCfg = publishedDesign.sidebar;
  const theme = publishedDesign.theme;

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!sidebarCfg.enabled) return null;

  const popularArticles = [...publishedArticles]
    .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
    .slice(0, 5);
  const trendingArticles = publishedArticles.filter((a) => a.isTrending).slice(0, 5);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      await subscribeNewsletter(email.trim());
      setSubscribed(true);
      setEmail('');
    } catch {
      setErrorMsg('Could not subscribe right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="space-y-8">
      {sidebarCfg.widgets
        .filter((w) => w.enabled)
        .map((widget) => {
          if (widget.type === 'most_popular') {
            return (
              <section
                key={widget.id}
                className="border-t-2 border-stone-900 dark:border-stone-100 pt-4"
              >
                <h3 className="font-editorial-heading text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">
                  {widget.title}
                </h3>
                <ol className="divide-y divide-stone-200 dark:divide-stone-800">
                  {popularArticles.map((art, index) => (
                    <li key={art.id} className="py-3 flex items-start gap-3">
                      <span
                        className="font-editorial-heading text-xl font-bold tabular-nums leading-none mt-0.5"
                        style={{ color: theme.primaryColor }}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <Link
                          to={`/news/${art.slug}`}
                          className="text-sm font-semibold text-stone-900 dark:text-stone-100 hover:underline leading-snug block"
                        >
                          {art.title}
                        </Link>
                        <span className="text-xs text-stone-500 dark:text-stone-400 mt-1 block tabular-nums">
                          {art.categoryName} · {(art.viewsCount || 0).toLocaleString()} reads
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            );
          }

          if (widget.type === 'trending') {
            return (
              <section
                key={widget.id}
                className="border-t-2 border-stone-900 dark:border-stone-100 pt-4"
              >
                <h3 className="font-editorial-heading text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">
                  {widget.title}
                </h3>
                <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                  {trendingArticles.map((art) => (
                    <li key={art.id} className="py-2.5">
                      <Link
                        to={`/news/${art.slug}`}
                        className="text-sm font-medium text-stone-800 dark:text-stone-200 hover:underline block leading-snug"
                      >
                        {art.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          }

          if (widget.type === 'ad_sidebar') {
            return <AdSlot key={widget.id} placement="sidebar" showAll />;
          }

          if (widget.type === 'newsletter') {
            return (
              <section
                key={widget.id}
                className="p-5 border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/70 rounded"
              >
                <div className="flex items-center gap-2 mb-2 text-stone-900 dark:text-stone-100">
                  <Mail className="w-4 h-4" />
                  <h3 className="font-editorial-heading text-lg font-bold">{widget.title}</h3>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
                  Receive our curated morning briefing and breaking dispatches directly in your inbox.
                </p>
                {subscribed ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Subscribed to The Meridian Dispatch.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="space-y-2.5">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="reader@domain.com"
                      className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                    />
                    {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2 px-4 text-xs font-semibold text-white rounded transition-opacity hover:opacity-90 disabled:opacity-60"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {submitting ? 'Subscribing...' : 'Subscribe Free'}
                    </button>
                  </form>
                )}
              </section>
            );
          }

          if (widget.type === 'categories') {
            return (
              <section
                key={widget.id}
                className="border-t border-stone-200 dark:border-stone-800 pt-4"
              >
                <h3 className="font-editorial-heading text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">
                  {widget.title}
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/category/${cat.slug}`}
                      className="text-xs font-medium text-stone-700 dark:text-stone-300 hover:underline py-1 border-b border-stone-100 dark:border-stone-800"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </section>
            );
          }

          return null;
        })}
    </aside>
  );
}
