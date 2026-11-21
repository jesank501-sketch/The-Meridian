import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, RefreshCw, Save } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { auth } from '../../lib/firebase';
import { saveWebsiteSettings } from '../../lib/firestoreService';
import { MediaPickerModal } from './MediaLibraryManager';
import type { WebsiteSettings } from '../../types/portal';

export function SettingsAndSeoManager({ mode }: { mode: 'general' | 'seo' }) {
  const {
    websiteSettings,
    publishedArticles,
    categories,
    pages,
    contactMessages,
    currentUser,
    isAdmin,
  } = usePortal();

  const [form, setForm] = useState<WebsiteSettings>(() => structuredClone(websiteSettings));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setForm(structuredClone(websiteSettings));
  }, [websiteSettings]);

  if (!isAdmin) {
    return (
      <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm">
        Administrator or Super Admin permissions are required to edit site and SEO settings.
      </div>
    );
  }

  const syncServerSeo = async (robotsTxtValue: string) => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;
    const today = new Date().toISOString().slice(0, 10);
    const entries = [
      { loc: '/', lastmod: today, changefreq: 'hourly', priority: '1.0' },
      ...categories.map((c) => ({
        loc: `/category/${c.slug}`,
        lastmod: today,
        changefreq: 'hourly',
        priority: '0.8',
      })),
      ...publishedArticles.map((a) => ({
        loc: `/news/${a.slug}`,
        lastmod: today,
        changefreq: 'daily',
        priority: '0.9',
      })),
      ...pages
        .filter((p) => p.status === 'published')
        .map((p) => ({
          loc: `/page/${p.slug}`,
          lastmod: today,
          changefreq: 'monthly',
          priority: '0.6',
        })),
    ].slice(0, 500);

    await fetch('/api/seo/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ robotsTxt: robotsTxtValue, entries }),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setMsg('');
    try {
      await saveWebsiteSettings(form, currentUser);
      await syncServerSeo(form.robotsTxt).catch(() => null);
      setMsg(
        mode === 'seo'
          ? 'SEO configuration, XML sitemap, and robots.txt saved and synchronized.'
          : 'General website settings saved.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'seo') {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">SEO & Search Engine Settings</h1>
            <p className="text-xs text-stone-500 mt-1">
              Manage default metadata, Open Graph sharing image, robots.txt, and live XML sitemap.
            </p>
          </div>
          <div className="flex gap-2 text-xs">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              View /sitemap.xml
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              View /robots.txt
            </a>
          </div>
        </div>

        {msg && <p className="text-xs text-emerald-600">{msg}</p>}

        <form
          onSubmit={handleSave}
          className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg space-y-4 text-xs"
        >
          <div>
            <label className="block font-medium mb-1">Default SEO Title</label>
            <input
              type="text"
              required
              value={form.seoTitle}
              onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Default Meta Description</label>
            <textarea
              rows={2}
              value={form.seoDescription}
              onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Meta Keywords</label>
            <input
              type="text"
              value={form.seoKeywords}
              onChange={(e) => setForm({ ...form, seoKeywords: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Default Open Graph Social Image</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.ogImage}
                onChange={(e) => setForm({ ...form, ogImage: e.target.value })}
                className="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Library
              </button>
            </div>
          </div>
          <div>
            <label className="block font-medium mb-1">Canonical Base URL</label>
            <input
              type="url"
              value={form.canonicalBaseUrl}
              onChange={(e) => setForm({ ...form, canonicalBaseUrl: e.target.value })}
              placeholder="https://meridiandispatch.org"
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Robots.txt Configuration</label>
            <textarea
              rows={4}
              value={form.robotsTxt}
              onChange={(e) => setForm({ ...form, robotsTxt: e.target.value })}
              className="w-full px-3 py-2 font-mono border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {saving ? 'Saving & Syncing...' : 'Save SEO & Sync Sitemap'}
          </button>
        </form>

        <MediaPickerModal
          open={pickerOpen}
          onSelect={(asset) => setForm((prev) => ({ ...prev, ogImage: asset.url }))}
          onClose={() => setPickerOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">General Settings & Newsroom Inbox</h1>
        <p className="text-xs text-stone-500 mt-1">
          Configure publication identity, contact details, social links, and view contact submissions.
        </p>
      </div>

      {msg && <p className="text-xs text-emerald-600">{msg}</p>}

      <form
        onSubmit={handleSave}
        className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg space-y-4 text-xs"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Publication Name</label>
            <input
              type="text"
              required
              value={form.siteName}
              onChange={(e) => setForm({ ...form, siteName: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Edition Label</label>
            <input
              type="text"
              value={form.editionLabel}
              onChange={(e) => setForm({ ...form, editionLabel: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-medium mb-1">Tagline</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Newsroom Contact Email</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Telephone</label>
            <input
              type="text"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-medium mb-1">Bureau Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
        </div>

        <h3 className="text-sm font-bold pt-3 border-t border-stone-200 dark:border-stone-800">
          Social Media Links
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['twitter', 'facebook', 'instagram', 'youtube', 'linkedin'] as const).map((key) => (
            <div key={key}>
              <label className="block font-medium capitalize mb-1">{key}</label>
              <input
                type="url"
                value={form.socialLinks?.[key] || ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    socialLinks: { ...form.socialLinks, [key]: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
        >
          <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save General Settings'}
        </button>
      </form>

      {/* Contact Messages Inbox */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-bold">Contact Form Inquiries ({contactMessages.length})</h2>
        {contactMessages.length === 0 ? (
          <p className="text-xs text-stone-500">No reader contact messages received yet.</p>
        ) : (
          <div className="divide-y divide-stone-200 dark:divide-stone-800 text-xs">
            {contactMessages.map((m) => (
              <div key={m.id} className="py-3 space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>
                    {m.subject} — {m.name} ({m.email})
                  </span>
                  <span className="uppercase text-stone-400">{m.status}</span>
                </div>
                <p className="text-stone-600 dark:text-stone-300">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
