import React from 'react';
import { Play, Images } from 'lucide-react';
import { Link } from '../../lib/router';
import { formatFirestoreDate } from '../../lib/sanitize';
import { usePortal } from '../../context/PortalContext';
import { SafeImage } from '../common/SafeImage';
import type { NewsArticle, SectionLayout } from '../../types/portal';

interface NewsCardProps {
  article: NewsArticle;
  layoutOverride?: SectionLayout;
  compact?: boolean;
}

export function NewsCard({ article, layoutOverride, compact = false }: NewsCardProps) {
  const { publishedDesign } = usePortal();
  const cards = publishedDesign.cards;
  const theme = publishedDesign.theme;
  const effectiveLayout = layoutOverride || cards.defaultLayout;
  const dateLabel = formatFirestoreDate(article.publishedAt || article.createdAt);

  const borderCls =
    theme.borderStyle === 'none'
      ? ''
      : theme.borderStyle === 'solid'
      ? 'border border-stone-300 dark:border-stone-700'
      : 'border border-stone-200/80 dark:border-stone-800';

  const isDark = theme.mode === 'dark';
  const cardBgStyle: React.CSSProperties = {
    backgroundColor: isDark ? undefined : cards.cardBackground || '#ffffff',
    borderRadius: `${cards.borderRadius ?? 4}px`,
  };

  const aspectCls =
    cards.imageAspectRatio === '16/9'
      ? 'aspect-video'
      : cards.imageAspectRatio === '3/2'
      ? 'aspect-[3/2]'
      : cards.imageAspectRatio === '1/1'
      ? 'aspect-square'
      : 'aspect-[4/3]';

  if (effectiveLayout === 'list' || compact) {
    return (
      <article
        className={`group flex items-start gap-4 py-4 border-b border-stone-200 dark:border-stone-800 last:border-b-0`}
      >
        {!compact && article.featuredImage && (
          <Link
            to={`/news/${article.slug}`}
            className="w-28 sm:w-36 shrink-0 overflow-hidden bg-stone-100 dark:bg-stone-800"
            style={{ borderRadius: `${cards.borderRadius ?? 4}px` }}
          >
            <SafeImage
              src={article.featuredImage}
              alt={article.title}
              fallbackTitle={article.title}
              className="w-full h-20 sm:h-24 object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mb-1">
            <Link
              to={`/category/${article.categorySlug}`}
              className="font-semibold uppercase tracking-wider hover:underline"
              style={{ color: theme.primaryColor }}
            >
              {article.categoryName}
            </Link>
            {dateLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span>{dateLabel}</span>
              </>
            )}
          </div>
          <Link to={`/news/${article.slug}`} className="block">
            <h3
              className="font-editorial-heading font-bold leading-snug text-stone-900 dark:text-stone-100 group-hover:underline decoration-1 underline-offset-4"
              style={{ fontSize: compact ? '15px' : `${Math.max(15, (cards.titleFontSize || 19) - 2)}px` }}
            >
              {article.title}
            </h3>
          </Link>
          {!compact && (
            <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-400 line-clamp-2 font-editorial-body">
              {article.excerpt}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
            <span>By {article.authorName}</span>
            {article.readTimeMinutes && (
              <>
                <span aria-hidden="true">·</span>
                <span>{article.readTimeMinutes} min read</span>
              </>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group flex flex-col overflow-hidden transition-colors ${borderCls} dark:bg-stone-900/60`}
      style={cardBgStyle}
    >
      <Link
        to={`/news/${article.slug}`}
        className={`relative block overflow-hidden bg-stone-100 dark:bg-stone-800 ${aspectCls}`}
      >
        <SafeImage
          src={article.featuredImage}
          alt={article.title}
          fallbackTitle={article.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          style={cards.imageHeightPx ? { maxHeight: `${cards.imageHeightPx + 80}px` } : undefined}
        />
        {(article.youtubeUrl || article.isVideoNews) && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 bg-stone-950/80 text-white text-xs px-2 py-1 rounded">
            <Play className="w-3 h-3 fill-current" /> Video
          </span>
        )}
        {article.galleryImages && article.galleryImages.length > 1 && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 bg-stone-950/80 text-white text-xs px-2 py-1 rounded">
            <Images className="w-3 h-3" /> {article.galleryImages.length}
          </span>
        )}
      </Link>

      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mb-2">
          <Link
            to={`/category/${article.categorySlug}`}
            className="font-semibold uppercase tracking-wider hover:underline"
            style={{ color: theme.primaryColor }}
          >
            {article.categoryName}
          </Link>
          {dateLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>{dateLabel}</span>
            </>
          )}
        </div>

        <Link to={`/news/${article.slug}`} className="block mb-2">
          <h3
            className="font-editorial-heading font-bold leading-snug text-stone-900 dark:text-stone-100 group-hover:underline decoration-1 underline-offset-4"
            style={{ fontSize: `${cards.titleFontSize || 19}px` }}
          >
            {article.title}
          </h3>
        </Link>

        <p className="text-sm text-stone-600 dark:text-stone-300 line-clamp-3 font-editorial-body leading-relaxed flex-1">
          {article.excerpt}
        </p>

        <div className="mt-4 pt-3 border-t border-stone-200/70 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <span className="truncate">By {article.authorName}</span>
          {article.readTimeMinutes && (
            <span className="shrink-0 tabular-nums">{article.readTimeMinutes} min read</span>
          )}
        </div>
      </div>
    </article>
  );
}
