import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Mail, Play } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { Link } from '../../lib/router';
import { extractYouTubeEmbedUrl, formatFirestoreDate } from '../../lib/sanitize';
import { subscribeNewsletter, trackPageView } from '../../lib/firestoreService';
import { SafeImage } from '../common/SafeImage';
import { AdSlot } from '../common/AdSlot';
import { NewsCard } from './NewsCard';
import { PublicSidebar } from './PublicSidebar';
import type { HomepageSection, NewsArticle } from '../../types/portal';

function InlineNewsletterSection({ title }: { title: string }) {
  const { publishedDesign } = usePortal();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!email.includes('@')) {
      setErr('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await subscribeNewsletter(email, name);
      setDone(true);
      setName('');
      setEmail('');
    } catch {
      setErr('Unable to process subscription right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/70 p-6 sm:p-8 rounded">
      <div className="max-w-3xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 mb-1.5">
            <Mail className="w-4 h-4" />
            <h2 className="font-editorial-heading text-2xl font-bold">{title}</h2>
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Daily curated headlines, investigative reports, and global bureau dispatches.
          </p>
        </div>

        {done ? (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span>You are subscribed to the daily edition.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="px-3.5 py-2.5 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="px-3.5 py-2.5 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 min-w-[220px]"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded whitespace-nowrap shrink-0 transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: publishedDesign.theme.primaryColor }}
            >
              {loading ? 'Saving...' : 'Subscribe'}
            </button>
          </form>
        )}
      </div>
      {err && <p className="text-xs text-red-600 text-center mt-2">{err}</p>}
    </div>
  );
}

export function PublicHomePage() {
  const { publishedArticles, publishedSections, publishedDesign, advertisements } = usePortal();

  useEffect(() => {
    trackPageView('/');
  }, []);

  const sidebarCfg = publishedDesign.sidebar;
  const visibleSections = publishedSections.filter((s) => s.isVisible);
  const heroSection = visibleSections.find((s) => s.sectionType === 'hero');
  const bodySections = visibleSections.filter((s) => s.id !== heroSection?.id);
  const today = new Date().toISOString().slice(0, 10);
  const hasActiveSponsoredSectionAds = advertisements.some((ad) => {
    if (!ad.isActive || ad.placement !== 'sponsored_section') return false;
    if (ad.startDate && ad.startDate > today) return false;
    if (ad.endDate && ad.endDate < today) return false;
    return true;
  });
  const hasExplicitSponsoredSection = bodySections.some((s) => s.sectionType === 'sponsored_ads');

  const getArticlesForSection = (sec: HomepageSection): NewsArticle[] => {
    const limitNum = sec.articleLimit || 3;
    switch (sec.sectionType) {
      case 'hero': {
        const feat = publishedArticles.filter((a) => a.isFeatured || a.isBreaking);
        return (feat.length > 0 ? feat : publishedArticles).slice(0, limitNum);
      }
      case 'featured':
        return publishedArticles.filter((a) => a.isFeatured).slice(0, limitNum);
      case 'latest':
        return publishedArticles.slice(0, limitNum);
      case 'category':
        return publishedArticles
          .filter((a) => a.categorySlug === sec.categorySlug)
          .slice(0, limitNum);
      case 'gallery':
        return publishedArticles
          .filter((a) => a.isPhotoGallery || (a.galleryImages && a.galleryImages.length > 0))
          .slice(0, limitNum);
      case 'video':
        return publishedArticles
          .filter((a) => a.isVideoNews || Boolean(a.youtubeUrl))
          .slice(0, limitNum);
      case 'popular':
        return [...publishedArticles]
          .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
          .slice(0, limitNum);
      case 'trending':
        return publishedArticles.filter((a) => a.isTrending).slice(0, limitNum);
      default:
        return [];
    }
  };

  const renderHero = (sec: HomepageSection) => {
    const items = getArticlesForSection(sec);
    if (items.length === 0) return null;
    const [lead, ...secondary] = items;

    return (
      <section
        key={sec.id}
        className="py-6 sm:py-8 border-b border-stone-200 dark:border-stone-800"
        style={sec.backgroundColor ? { backgroundColor: sec.backgroundColor } : undefined}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <article className="lg:col-span-7 flex flex-col">
            <Link
              to={`/news/${lead.slug}`}
              className="block overflow-hidden bg-stone-100 dark:bg-stone-800 rounded mb-4 aspect-[16/10]"
            >
              <SafeImage
                src={lead.featuredImage}
                alt={lead.title}
                fallbackTitle={lead.title}
                className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500"
              />
            </Link>
            <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-2">
              <Link
                to={`/category/${lead.categorySlug}`}
                className="font-bold uppercase tracking-wider hover:underline"
                style={{ color: publishedDesign.theme.primaryColor }}
              >
                {lead.categoryName}
              </Link>
              <span aria-hidden="true">·</span>
              <span>{formatFirestoreDate(lead.publishedAt || lead.createdAt)}</span>
              {lead.isBreaking && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">
                    Breaking Dispatch
                  </span>
                </>
              )}
            </div>
            <Link to={`/news/${lead.slug}`}>
              <h1 className="font-editorial-heading text-3xl sm:text-4xl font-extrabold leading-tight text-stone-900 dark:text-stone-50 hover:underline decoration-2 underline-offset-4 text-balance">
                {lead.title}
              </h1>
            </Link>
            <p className="mt-3 text-base text-stone-600 dark:text-stone-300 font-editorial-body leading-relaxed">
              {lead.excerpt}
            </p>
            <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
              By {lead.authorName}
              {lead.reporterName ? ` · ${lead.reporterName}` : ''}
            </p>
          </article>

          <div className="lg:col-span-5 lg:border-l lg:border-stone-200 dark:lg:border-stone-800 lg:pl-8 flex flex-col justify-between divide-y divide-stone-200 dark:divide-stone-800">
            {secondary.map((art) => (
              <NewsCard key={art.id} article={art} layoutOverride="list" />
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderSection = (sec: HomepageSection) => {
    if (sec.sectionType === 'ad_banner') {
      return (
        <section key={sec.id} className="py-4">
          <AdSlot placement="homepage_banner" showAll />
        </section>
      );
    }

    if (sec.sectionType === 'sponsored_ads') {
      if (!hasActiveSponsoredSectionAds) return null;
      return (
        <section
          key={sec.id}
          className="py-8 border-t border-stone-200 dark:border-stone-800"
          style={sec.backgroundColor ? { backgroundColor: sec.backgroundColor } : undefined}
        >
          <h2 className="font-editorial-heading text-2xl font-bold text-stone-900 dark:text-stone-100 mb-5">
            {sec.title}
          </h2>
          <AdSlot placement="sponsored_section" showAll />
        </section>
      );
    }

    if (sec.sectionType === 'newsletter') {
      return (
        <section key={sec.id} className="py-6">
          <InlineNewsletterSection title={sec.title} />
        </section>
      );
    }

    const items = getArticlesForSection(sec);
    if (items.length === 0) return null;

    if (sec.sectionType === 'video') {
      return (
        <section
          key={sec.id}
          className="py-8 border-t border-stone-200 dark:border-stone-800"
          style={sec.backgroundColor ? { backgroundColor: sec.backgroundColor } : undefined}
        >
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-editorial-heading text-2xl font-bold text-stone-900 dark:text-stone-100">
              {sec.title}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((art) => {
              const embedUrl = extractYouTubeEmbedUrl(art.youtubeUrl);
              return (
                <div
                  key={art.id}
                  className="border border-stone-200 dark:border-stone-800 rounded overflow-hidden bg-white dark:bg-stone-900/60"
                >
                  {embedUrl ? (
                    <div className="aspect-video bg-stone-950">
                      <iframe
                        src={embedUrl}
                        title={art.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <Link to={`/news/${art.slug}`} className="block aspect-video relative">
                      <SafeImage
                        src={art.featuredImage}
                        alt={art.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                        <Play className="w-10 h-10 fill-current" />
                      </span>
                    </Link>
                  )}
                  <div className="p-4">
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: publishedDesign.theme.primaryColor }}
                    >
                      {art.categoryName}
                    </span>
                    <Link to={`/news/${art.slug}`}>
                      <h3 className="font-editorial-heading text-lg font-bold text-stone-900 dark:text-stone-100 mt-1 hover:underline">
                        {art.title}
                      </h3>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    if (sec.sectionType === 'gallery') {
      return (
        <section
          key={sec.id}
          className="py-8 border-t border-stone-200 dark:border-stone-800"
          style={sec.backgroundColor ? { backgroundColor: sec.backgroundColor } : undefined}
        >
          <h2 className="font-editorial-heading text-2xl font-bold text-stone-900 dark:text-stone-100 mb-5">
            {sec.title}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((art) => (
              <Link
                key={art.id}
                to={`/news/${art.slug}`}
                className="group relative aspect-[4/3] overflow-hidden rounded bg-stone-100 dark:bg-stone-800"
              >
                <SafeImage
                  src={art.featuredImage}
                  alt={art.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3.5 flex flex-col justify-end">
                  <span className="text-[11px] uppercase tracking-wider text-stone-300">
                    {art.categoryName}
                  </span>
                  <h3 className="font-editorial-heading text-sm font-bold text-white line-clamp-2 mt-0.5">
                    {art.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section
        key={sec.id}
        className="py-8 border-t border-stone-200 dark:border-stone-800"
        style={sec.backgroundColor ? { backgroundColor: sec.backgroundColor } : undefined}
      >
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-editorial-heading text-2xl font-bold text-stone-900 dark:text-stone-100">
            {sec.title}
          </h2>
          {sec.categorySlug && (
            <Link
              to={`/category/${sec.categorySlug}`}
              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:underline whitespace-nowrap shrink-0"
              style={{ color: publishedDesign.theme.primaryColor }}
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {sec.layout === 'magazine' && items.length >= 2 ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-6">
              <NewsCard article={items[0]} layoutOverride="grid" />
            </div>
            <div className="md:col-span-6 divide-y divide-stone-200 dark:divide-stone-800">
              {items.slice(1).map((art) => (
                <NewsCard key={art.id} article={art} layoutOverride="list" />
              ))}
            </div>
          </div>
        ) : sec.layout === 'list' ? (
          <div className="divide-y divide-stone-200 dark:divide-stone-800">
            {items.map((art) => (
              <NewsCard key={art.id} article={art} layoutOverride="list" />
            ))}
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{ gap: `${publishedDesign.cards.cardSpacing || 24}px` }}
          >
            {items.map((art) => (
              <NewsCard key={art.id} article={art} layoutOverride="grid" />
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6">
      {heroSection && renderHero(heroSection)}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-2">
        {sidebarCfg.enabled && sidebarCfg.position === 'left' && (
          <div className="lg:col-span-4 pt-8 order-2 lg:order-1">
            <PublicSidebar />
          </div>
        )}

        <div className={sidebarCfg.enabled ? 'lg:col-span-8 order-1 lg:order-2' : 'lg:col-span-12'}>
          {bodySections.map(renderSection)}
          {hasActiveSponsoredSectionAds && !hasExplicitSponsoredSection && (
            <section className="py-8 border-t border-stone-200 dark:border-stone-800">
              <h2 className="font-editorial-heading text-2xl font-bold text-stone-900 dark:text-stone-100 mb-5">
                Sponsored & Partner Links
              </h2>
              <AdSlot placement="sponsored_section" showAll />
            </section>
          )}
        </div>

        {sidebarCfg.enabled && sidebarCfg.position !== 'left' && (
          <div className="lg:col-span-4 pt-8 order-2">
            <PublicSidebar />
          </div>
        )}
      </div>
    </main>
  );
}
