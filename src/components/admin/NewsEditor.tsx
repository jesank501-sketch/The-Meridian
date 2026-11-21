import React, { useRef, useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import {
  ArrowLeft,
  Eye,
  Image as ImageIcon,
  Plus,
  Save,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { saveArticle, uploadMediaFile } from '../../lib/firestoreService';
import { extractYouTubeEmbedUrl, sanitizeHtml, slugify } from '../../lib/sanitize';
import { RichTextEditor } from '../common/RichTextEditor';
import { SafeImage } from '../common/SafeImage';
import { MediaPickerModal } from './MediaLibraryManager';
import type { ArticleStatus, NewsArticle } from '../../types/portal';

interface NewsEditorProps {
  initialArticle: NewsArticle | null;
  onDone: () => void;
}

export function NewsEditor({ initialArticle, onDone }: NewsEditorProps) {
  const { categories, tags, currentUser } = usePortal();
  const featuredUploadRef = useRef<HTMLInputElement>(null);
  const galleryUploadRef = useRef<HTMLInputElement>(null);

  const defaultCategory = categories[0];

  const [title, setTitle] = useState(initialArticle?.title || '');
  const [slug, setSlug] = useState(initialArticle?.slug || '');
  const [excerpt, setExcerpt] = useState(initialArticle?.excerpt || '');
  const [contentHtml, setContentHtml] = useState(initialArticle?.contentHtml || '<p></p>');
  const [featuredImage, setFeaturedImage] = useState(initialArticle?.featuredImage || '');
  const [imageCaption, setImageCaption] = useState(initialArticle?.imageCaption || '');
  const [imageCredit, setImageCredit] = useState(initialArticle?.imageCredit || '');
  const [galleryImages, setGalleryImages] = useState<string[]>(initialArticle?.galleryImages || []);
  const [youtubeUrl, setYoutubeUrl] = useState(initialArticle?.youtubeUrl || '');
  const [categoryId, setCategoryId] = useState(
    initialArticle?.categoryId || defaultCategory?.id || ''
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(initialArticle?.tagNames || []);
  const [authorName, setAuthorName] = useState(
    initialArticle?.authorName || currentUser?.displayName || ''
  );
  const [reporterName, setReporterName] = useState(initialArticle?.reporterName || '');
  const [isBreaking, setIsBreaking] = useState(initialArticle?.isBreaking || false);
  const [isFeatured, setIsFeatured] = useState(initialArticle?.isFeatured || false);
  const [isTrending, setIsTrending] = useState(initialArticle?.isTrending || false);
  const [readTimeMinutes, setReadTimeMinutes] = useState(initialArticle?.readTimeMinutes || 4);
  const [scheduledDateStr, setScheduledDateStr] = useState('');

  // SEO fields
  const [seoTitle, setSeoTitle] = useState(initialArticle?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(initialArticle?.seoDescription || '');
  const [seoKeywords, setSeoKeywords] = useState(initialArticle?.seoKeywords || '');
  const [canonicalUrl, setCanonicalUrl] = useState(initialArticle?.canonicalUrl || '');

  const [pickerTarget, setPickerTarget] = useState<'featured' | 'gallery' | 'editor' | null>(null);
  const [editorInsertFn, setEditorInsertFn] = useState<((url: string, alt?: string) => void) | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFeaturedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setUploading(true);
    setErrorMsg('');
    try {
      const asset = await uploadMediaFile(file, { title: title || file.name }, currentUser);
      setFeaturedImage(asset.url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Featured image upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentUser) return;
    setUploading(true);
    setErrorMsg('');
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        const asset = await uploadMediaFile(f, { title: f.name }, currentUser);
        urls.push(asset.url);
      }
      setGalleryImages((prev) => [...prev, ...urls].slice(0, 12));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gallery upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const toggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name].slice(0, 10)
    );
  };

  const handleSave = async (targetStatus: ArticleStatus) => {
    if (!currentUser) return;
    setErrorMsg('');
    if (title.trim().length < 3) {
      setErrorMsg('Headline must be at least 3 characters.');
      return;
    }
    if (!excerpt.trim()) {
      setErrorMsg('Please provide a short article description / deck.');
      return;
    }
    const selectedCat = categories.find((c) => c.id === categoryId) || defaultCategory;
    if (!selectedCat) {
      setErrorMsg('Please select a category.');
      return;
    }

    setSaving(true);
    try {
      let scheduledForVal: unknown = null;
      if (targetStatus === 'scheduled') {
        if (!scheduledDateStr) {
          setErrorMsg('Choose a future date/time to schedule publication.');
          setSaving(false);
          return;
        }
        scheduledForVal = Timestamp.fromDate(new Date(scheduledDateStr));
      }

      await saveArticle(
        {
          id: initialArticle?.id,
          title: title.trim(),
          slug: slug.trim() || slugify(title),
          excerpt: excerpt.trim(),
          contentHtml: contentHtml || '<p></p>',
          featuredImage,
          imageCaption,
          imageCredit,
          galleryImages,
          youtubeUrl,
          categoryId: selectedCat.id,
          categoryName: selectedCat.name,
          categorySlug: selectedCat.slug,
          tagNames: selectedTags,
          authorId: initialArticle?.authorId || currentUser.uid,
          authorName: authorName.trim() || currentUser.displayName,
          reporterName: reporterName.trim(),
          status: targetStatus,
          isBreaking,
          isFeatured,
          isTrending,
          isVideoNews: Boolean(youtubeUrl.trim()),
          isPhotoGallery: galleryImages.length > 0,
          viewsCount: initialArticle?.viewsCount ?? 0,
          readTimeMinutes,
          seoTitle: seoTitle.trim() || title.trim(),
          seoDescription: seoDescription.trim() || excerpt.trim(),
          seoKeywords,
          ogImage: featuredImage,
          canonicalUrl,
          publishedAt: initialArticle?.publishedAt,
          scheduledFor: scheduledForVal,
        },
        currentUser
      );
      onDone();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save article.');
    } finally {
      setSaving(false);
    }
  };

  const ytPreview = extractYouTubeEmbedUrl(youtubeUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDone}
            className="p-2 border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold">
              {initialArticle ? 'Edit News Article' : 'Publish New Dispatch'}
            </h1>
            <p className="text-xs text-stone-500">
              Slug: <span className="font-mono">/news/{slug || slugify(title || 'untitled')}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('draft')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('published')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded hover:opacity-90"
          >
            <Send className="w-3.5 h-3.5" /> {saving ? 'Publishing...' : 'Publish Now'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 rounded">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Editorial Composer */}
        <div className="lg:col-span-8 space-y-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
              Headline
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!initialArticle) setSlug(slugify(e.target.value));
              }}
              placeholder="Write a clear, authoritative newspaper headline..."
              className="w-full px-3.5 py-2.5 text-lg font-editorial-heading font-bold border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">SEO URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Estimated Read Time (min)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={readTimeMinutes}
                onChange={(e) => setReadTimeMinutes(Number(e.target.value) || 4)}
                className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
              Deck / Summary Description
            </label>
            <textarea
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Concise two-sentence editorial summary shown on cards and search results..."
              className="w-full px-3.5 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
              Article Body (TipTap Rich Text)
            </label>
            <RichTextEditor
              value={contentHtml}
              onChange={setContentHtml}
              onOpenMediaPicker={(insertFn) => {
                setEditorInsertFn(() => insertFn);
                setPickerTarget('editor');
              }}
            />
          </div>

          {/* Photo Gallery & Video Embed */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Article Photo Gallery</h3>
              <div className="flex gap-2">
                <input
                  ref={galleryUploadRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleGalleryUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => galleryUploadRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-stone-300 dark:border-stone-700 rounded"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
                <button
                  type="button"
                  onClick={() => setPickerTarget('gallery')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs border border-stone-300 dark:border-stone-700 rounded"
                >
                  <Plus className="w-3.5 h-3.5" /> From Library
                </button>
              </div>
            </div>
            {galleryImages.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {galleryImages.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="relative aspect-[4/3] rounded overflow-hidden border border-stone-200 dark:border-stone-700">
                    <SafeImage src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setGalleryImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Embed YouTube Video URL (Optional)
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
              {ytPreview && (
                <div className="mt-2 aspect-video max-w-sm rounded overflow-hidden border border-stone-200 dark:border-stone-700">
                  <iframe src={ytPreview} title="Video Preview" className="w-full h-full" />
                </div>
              )}
            </div>
          </div>

          {/* SEO Settings */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
            <h3 className="text-sm font-bold">Article SEO & Social Card</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Custom SEO Title (defaults to headline)"
                className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
              <input
                type="text"
                value={seoKeywords}
                onChange={(e) => setSeoKeywords(e.target.value)}
                placeholder="Keywords (comma separated)"
                className="px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <textarea
              rows={2}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Meta description for search engines and Open Graph"
              className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
            <input
              type="url"
              value={canonicalUrl}
              onChange={(e) => setCanonicalUrl(e.target.value)}
              placeholder="Canonical URL (optional)"
              className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
        </div>

        {/* Right Editorial Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          {/* Featured Image */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-bold">Featured Image</h3>
            {featuredImage && (
              <div className="aspect-[16/10] rounded overflow-hidden bg-stone-100 dark:bg-stone-800">
                <SafeImage src={featuredImage} alt="Featured" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={featuredUploadRef}
                type="file"
                accept="image/*"
                onChange={handleFeaturedUpload}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => featuredUploadRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded"
              >
                <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                type="button"
                onClick={() => setPickerTarget('featured')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Media Library
              </button>
            </div>
            <input
              type="text"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              placeholder="Image caption"
              className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
            <input
              type="text"
              value={imageCredit}
              onChange={(e) => setImageCredit(e.target.value)}
              placeholder="Photo credit (e.g. Photo: Bureau / Dispatch)"
              className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>

          {/* Classification & Byline */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-bold">Category, Tags & Byline</h3>
            <div>
              <label className="block text-xs font-medium mb-1">Primary Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Tags (up to 10)</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => {
                  const active = selectedTags.includes(t.name);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.name)}
                      className={`px-2.5 py-1 text-xs rounded border ${
                        active
                          ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900'
                          : 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Author Name</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Reporter / Bureau Credit</label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="e.g. Geneva Diplomatic Bureau"
                className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
          </div>

          {/* Placement Flags & Scheduling */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-bold">Placement & Scheduling</h3>
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={isBreaking}
                onChange={(e) => setIsBreaking(e.target.checked)}
              />
              Mark as Breaking News (Ticker & Hero)
            </label>
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              Mark as Featured Story
            </label>
            <label className="flex items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={isTrending}
                onChange={(e) => setIsTrending(e.target.checked)}
              />
              Mark as Trending News
            </label>

            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
              <label className="block text-xs font-medium">Schedule Future Publication</label>
              <input
                type="datetime-local"
                value={scheduledDateStr}
                onChange={(e) => setScheduledDateStr(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave('scheduled')}
                className="w-full py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                Schedule Article
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        open={pickerTarget !== null}
        onSelect={(asset) => {
          if (pickerTarget === 'featured') {
            setFeaturedImage(asset.url);
            if (!imageCaption && asset.caption) setImageCaption(asset.caption);
          } else if (pickerTarget === 'gallery') {
            setGalleryImages((prev) => [...prev, asset.url].slice(0, 12));
          } else if (pickerTarget === 'editor' && editorInsertFn) {
            editorInsertFn(asset.url, asset.altText || asset.title);
          }
        }}
        onClose={() => setPickerTarget(null)}
      />

      {/* Article Live Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 mb-6">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Pre-Publication Preview
              </span>
              <button type="button" onClick={() => setPreviewOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <h1 className="font-editorial-heading text-3xl font-extrabold mb-3">{title || 'Untitled Headline'}</h1>
            <p className="text-base text-stone-600 dark:text-stone-300 mb-4 font-editorial-body">
              {excerpt}
            </p>
            {featuredImage && (
              <SafeImage
                src={featuredImage}
                alt={title}
                className="w-full aspect-[16/9] object-cover rounded mb-4"
              />
            )}
            <div
              className="article-prose text-stone-800 dark:text-stone-200"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(contentHtml) }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
