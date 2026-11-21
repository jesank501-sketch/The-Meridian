import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { Link } from '../../lib/router';
import {
  extractYouTubeEmbedUrl,
  formatFirestoreDate,
  sanitizeHtml,
} from '../../lib/sanitize';
import { submitReaderComment, trackPageView } from '../../lib/firestoreService';
import { SafeImage } from '../common/SafeImage';
import { AdSlot } from '../common/AdSlot';
import { NewsCard } from './NewsCard';
import { PublicSidebar } from './PublicSidebar';

export function ArticleDetailPage({ slug }: { slug: string }) {
  const {
    publishedArticles,
    articles,
    comments,
    currentUser,
    isEditorialStaff,
    publishedDesign,
  } = usePortal();

  const pool = isEditorialStaff ? articles : publishedArticles;
  const article = pool.find((a) => a.slug === slug);

  const [commentName, setCommentName] = useState(currentUser?.displayName || '');
  const [commentBody, setCommentBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentDone, setCommentDone] = useState(false);
  const [commentErr, setCommentErr] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (currentUser?.displayName && !commentName) {
      setCommentName(currentUser.displayName);
    }
  }, [currentUser, commentName]);

  useEffect(() => {
    if (article) {
      trackPageView(`/news/${article.slug}`, article.status === 'published' ? article.id : undefined);
      document.title = article.seoTitle || article.title;
    }
  }, [article?.id]);

  if (!article) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-editorial-heading text-3xl font-bold text-stone-900 dark:text-stone-100 mb-3">
          Article Not Found
        </h1>
        <p className="text-stone-600 dark:text-stone-400 mb-6">
          This dispatch may have been moved or is awaiting editorial publication.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded"
          style={{ backgroundColor: publishedDesign.theme.primaryColor }}
        >
          <ArrowLeft className="w-4 h-4" /> Return to Front Page
        </Link>
      </main>
    );
  }

  const indexInPublished = publishedArticles.findIndex((a) => a.id === article.id);
  const prevArticle = indexInPublished > 0 ? publishedArticles[indexInPublished - 1] : null;
  const nextArticle =
    indexInPublished >= 0 && indexInPublished < publishedArticles.length - 1
      ? publishedArticles[indexInPublished + 1]
      : null;

  const relatedArticles = publishedArticles
    .filter((a) => a.id !== article.id && a.categorySlug === article.categorySlug)
    .slice(0, 3);

  const approvedComments = comments.filter(
    (c) => c.newsId === article.id && c.status === 'approved'
  );

  const embedUrl = extractYouTubeEmbedUrl(article.youtubeUrl);
  const safeBodyHtml = sanitizeHtml(article.contentHtml);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCommentErr('');
    if (commentName.trim().length < 2 || commentBody.trim().length < 2) {
      setCommentErr('Please enter your name and comment.');
      return;
    }
    setSubmitting(true);
    try {
      await submitReaderComment({
        newsId: article.id,
        newsTitle: article.title,
        authorName: commentName,
        userId: currentUser?.uid || '',
        content: commentBody,
      });
      setCommentDone(true);
      setCommentBody('');
    } catch {
      setCommentErr('Could not submit your comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const shareUrl = window.location.href;
  const handleShareCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <article className="lg:col-span-8">
          {/* Breadcrumb & Kicker */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-3">
            <Link to="/" className="hover:underline">
              Front Page
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              to={`/category/${article.categorySlug}`}
              className="font-semibold uppercase tracking-wider hover:underline"
              style={{ color: publishedDesign.theme.primaryColor }}
            >
              {article.categoryName}
            </Link>
            {article.status !== 'published' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="uppercase font-semibold text-amber-700 dark:text-amber-400">
                  Preview ({article.status})
                </span>
              </>
            )}
          </div>

          <h1 className="font-editorial-heading text-3xl sm:text-5xl font-extrabold leading-tight text-stone-900 dark:text-stone-50 text-balance">
            {article.title}
          </h1>

          <p className="mt-4 text-lg sm:text-xl text-stone-600 dark:text-stone-300 font-editorial-body leading-relaxed">
            {article.excerpt}
          </p>

          {/* Byline & Sharing Bar */}
          <div className="mt-6 py-4 border-y border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-stone-600 dark:text-stone-300">
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                By {article.authorName}
              </span>
              {article.reporterName && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>{article.reporterName}</span>
                </>
              )}
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                Published {formatFirestoreDate(article.publishedAt || article.createdAt)} ·{' '}
                {article.readTimeMinutes || 4} min read · {(article.viewsCount || 0).toLocaleString()} views
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Share on X
              </a>
              <button
                type="button"
                onClick={handleShareCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'Link Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Featured Photography */}
          {article.featuredImage && (
            <figure className="my-6">
              <div className="overflow-hidden rounded bg-stone-100 dark:bg-stone-800 aspect-[16/9]">
                <SafeImage
                  src={article.featuredImage}
                  alt={article.imageCaption || article.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {(article.imageCaption || article.imageCredit) && (
                <figcaption className="mt-2 text-xs text-stone-500 dark:text-stone-400 flex flex-wrap justify-between gap-2 italic font-editorial-body">
                  <span>{article.imageCaption}</span>
                  {article.imageCredit && <span className="not-italic">{article.imageCredit}</span>}
                </figcaption>
              )}
            </figure>
          )}

          {/* Embedded YouTube Report */}
          {embedUrl && (
            <div className="my-6 aspect-video rounded overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-950">
              <iframe
                src={embedUrl}
                title={`${article.title} Video Report`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Sanitized Rich-Text Body */}
          <div
            className="article-prose max-w-2xl text-stone-800 dark:text-stone-200 text-base sm:text-[17px] leading-relaxed mt-6"
            dangerouslySetInnerHTML={{ __html: safeBodyHtml }}
          />

          {/* Photo Gallery Strip */}
          {article.galleryImages && article.galleryImages.length > 0 && (
            <section className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
              <h3 className="font-editorial-heading text-lg font-bold text-stone-900 dark:text-stone-100 mb-3">
                Photo Gallery
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {article.galleryImages.map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className="aspect-[4/3] overflow-hidden rounded bg-stone-100 dark:bg-stone-800"
                  >
                    <SafeImage
                      src={imgUrl}
                      alt={`${article.title} gallery ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tags */}
          {article.tagNames && article.tagNames.length > 0 && (
            <div className="mt-8 pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
              <span className="font-semibold text-stone-700 dark:text-stone-300">Topics:</span>
              {article.tagNames.map((tag, i) => (
                <React.Fragment key={tag}>
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <Link
                    to={`/tag/${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'))}`}
                    className="hover:underline text-stone-700 dark:text-stone-300"
                  >
                    {tag}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="my-8 space-y-4">
            <AdSlot placement="article" showAll />
            <AdSlot placement="sponsored_section" showAll />
          </div>

          {/* Previous / Next Article Navigation */}
          {(prevArticle || nextArticle) && (
            <nav className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-y border-stone-200 dark:border-stone-800">
              <div>
                {prevArticle && (
                  <Link to={`/news/${prevArticle.slug}`} className="group block">
                    <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-stone-500">
                      <ArrowLeft className="w-3.5 h-3.5" /> Previous Dispatch
                    </span>
                    <p className="font-editorial-heading font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:underline mt-1">
                      {prevArticle.title}
                    </p>
                  </Link>
                )}
              </div>
              <div className="sm:text-right">
                {nextArticle && (
                  <Link to={`/news/${nextArticle.slug}`} className="group block">
                    <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-stone-500">
                      Next Dispatch <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <p className="font-editorial-heading font-bold text-sm text-stone-900 dark:text-stone-100 group-hover:underline mt-1">
                      {nextArticle.title}
                    </p>
                  </Link>
                )}
              </div>
            </nav>
          )}

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <section className="mt-10">
              <h2 className="font-editorial-heading text-2xl font-bold text-stone-900 dark:text-stone-100 mb-5">
                Related in {article.categoryName}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {relatedArticles.map((rel) => (
                  <NewsCard key={rel.id} article={rel} layoutOverride="grid" />
                ))}
              </div>
            </section>
          )}

          {/* Reader Comments & Moderation Submission */}
          <section className="mt-12 pt-8 border-t border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="w-5 h-5 text-stone-700 dark:text-stone-300" />
              <h2 className="font-editorial-heading text-2xl font-bold text-stone-900 dark:text-stone-100">
                Reader Discourse ({approvedComments.length})
              </h2>
            </div>

            {commentDone ? (
              <div className="p-4 border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 rounded text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2 mb-8">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Your comment has been submitted and is awaiting editorial moderation.</span>
              </div>
            ) : (
              <form
                onSubmit={handleCommentSubmit}
                className="mb-8 p-5 border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 rounded space-y-3"
              >
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Leave a comment
                </h3>
                <input
                  type="text"
                  required
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  placeholder="Your name"
                  className="w-full sm:w-72 px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
                <textarea
                  required
                  rows={3}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Share thoughtful analysis on this report..."
                  className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100"
                />
                {commentErr && <p className="text-xs text-red-600">{commentErr}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white rounded disabled:opacity-60"
                  style={{ backgroundColor: publishedDesign.theme.primaryColor }}
                >
                  {submitting ? 'Submitting...' : 'Post Comment'}
                </button>
              </form>
            )}

            {approvedComments.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No published reader comments yet. Be the first to contribute.
              </p>
            ) : (
              <div className="divide-y divide-stone-200 dark:divide-stone-800">
                {approvedComments.map((cmt) => (
                  <div key={cmt.id} className="py-4">
                    <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-1">
                      <span className="font-semibold text-stone-900 dark:text-stone-100">
                        {cmt.authorName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatFirestoreDate(cmt.createdAt)}</span>
                    </div>
                    <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                      {cmt.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </article>

        <div className="lg:col-span-4">
          <PublicSidebar />
        </div>
      </div>
    </main>
  );
}
