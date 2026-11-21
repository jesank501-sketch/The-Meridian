import React, { useEffect, useState } from 'react';
import { CheckCircle2, Mail, MapPin, Phone } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { sanitizeHtml } from '../../lib/sanitize';
import { submitContactMessage, trackPageView } from '../../lib/firestoreService';

export function StaticPageView({ slug }: { slug: string }) {
  const { pages, websiteSettings } = usePortal();
  const page = pages.find((p) => p.slug === slug && p.status === 'published');

  useEffect(() => {
    trackPageView(`/page/${slug}`);
    if (page) {
      document.title = page.seoTitle || `${page.title} – ${websiteSettings.siteName}`;
    }
  }, [slug, page, websiteSettings.siteName]);

  if (!page) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="font-editorial-heading text-3xl font-bold mb-2">Page Not Found</h1>
        <p className="text-stone-600 dark:text-stone-400">
          The requested page is unavailable or still in editorial draft.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-editorial-heading text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-50 pb-4 border-b border-stone-200 dark:border-stone-800">
        {page.title}
      </h1>
      <div
        className="article-prose mt-6 text-stone-800 dark:text-stone-200"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.contentHtml) }}
      />
    </main>
  );
}

export function ContactPage() {
  const { websiteSettings, publishedDesign } = usePortal();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    trackPageView('/contact');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (message.trim().length < 5) {
      setErr('Please enter a message of at least 5 characters.');
      return;
    }
    setLoading(true);
    try {
      await submitContactMessage({ name, email, subject, message });
      setDone(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setErr('Could not send your message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="border-b border-stone-200 dark:border-stone-800 pb-6 mb-8">
        <h1 className="font-editorial-heading text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-50">
          Contact the Newsroom
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Submit news tips, letters to the editor, or advertising inquiries directly to our editorial desk.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5 space-y-5">
          <div className="p-6 border border-stone-200 dark:border-stone-800 rounded bg-stone-50 dark:bg-stone-900/60 space-y-4">
            <h2 className="font-editorial-heading text-xl font-bold text-stone-900 dark:text-stone-100">
              Editorial Headquarters
            </h2>
            <div className="space-y-3 text-sm text-stone-600 dark:text-stone-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{websiteSettings.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 shrink-0" />
                <span>{websiteSettings.contactEmail}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{websiteSettings.contactPhone}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-7">
          {done ? (
            <div className="p-6 border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 rounded text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Message Received</p>
                <p className="text-sm mt-1">
                  Thank you for contacting {websiteSettings.siteName}. Our editorial desk has logged your inquiry.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1">
                  Message
                </label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                />
              </div>
              {err && <p className="text-xs text-red-600">{err}</p>}
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-semibold text-white rounded disabled:opacity-60"
                style={{ backgroundColor: publishedDesign.theme.primaryColor }}
              >
                {loading ? 'Sending...' : 'Send Inquiry'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
