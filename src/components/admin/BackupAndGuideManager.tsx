import React, { useRef, useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { usePortal } from '../../context/PortalContext';
import { db } from '../../lib/firebase';
import { logActivity } from '../../lib/firestoreService';
import type { Category, CustomPage, DesignSettings, HomepageSection, NavigationMenuItem, WebsiteSettings } from '../../types/portal';

export function BackupAndGuideManager() {
  const {
    articles,
    categories,
    tags,
    websiteSettings,
    publishedDesign,
    draftDesign,
    publishedSections,
    navMenus,
    pages,
    advertisements,
    currentUser,
    isSuperAdmin,
    reseedIfEmpty,
  } = usePortal();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  if (!isSuperAdmin) {
    return (
      <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm">
        Super Admin permissions are required for full database backup and restore operations.
      </div>
    );
  }

  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      portal: 'The Meridian Dispatch',
      websiteSettings,
      publishedDesign,
      draftDesign,
      categories,
      tags,
      publishedSections,
      navMenus,
      pages,
      advertisements,
      articles,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meridian-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Full JSON backup downloaded.');
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setErr('');
    setMsg('');
    setBusy(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as {
        websiteSettings?: WebsiteSettings;
        publishedDesign?: DesignSettings;
        draftDesign?: DesignSettings;
        categories?: Category[];
        publishedSections?: HomepageSection[];
        navMenus?: NavigationMenuItem[];
        pages?: CustomPage[];
      };

      const batch = writeBatch(db);
      if (data.websiteSettings) {
        batch.set(doc(db, 'websiteSettings', 'global'), {
          ...data.websiteSettings,
          updatedAt: serverTimestamp(),
        });
      }
      if (data.publishedDesign) {
        batch.set(doc(db, 'designSettings', 'published'), {
          ...data.publishedDesign,
          updatedBy: currentUser.uid,
          updatedAt: serverTimestamp(),
        });
      }
      if (data.draftDesign) {
        batch.set(doc(db, 'designSettings', 'draft'), {
          ...data.draftDesign,
          updatedBy: currentUser.uid,
          updatedAt: serverTimestamp(),
        });
      }
      if (Array.isArray(data.categories)) {
        for (const cat of data.categories) {
          batch.set(doc(db, 'categories', cat.id), {
            name: cat.name,
            slug: cat.slug,
            description: cat.description || '',
            order: cat.order ?? 0,
            isActive: cat.isActive ?? true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      if (Array.isArray(data.publishedSections)) {
        for (const sec of data.publishedSections) {
          batch.set(doc(db, 'homepageSections', sec.id), {
            title: sec.title,
            sectionType: sec.sectionType,
            categorySlug: sec.categorySlug || '',
            layout: sec.layout,
            articleLimit: sec.articleLimit,
            backgroundColor: sec.backgroundColor || '',
            isVisible: sec.isVisible,
            order: sec.order,
            scope: 'published',
            updatedAt: serverTimestamp(),
          });
        }
      }
      if (Array.isArray(data.navMenus)) {
        for (const nav of data.navMenus) {
          batch.set(doc(db, 'navigationMenus', nav.id), {
            label: nav.label,
            url: nav.url,
            location: nav.location,
            order: nav.order,
            isActive: nav.isActive,
            updatedAt: serverTimestamp(),
          });
        }
      }
      if (Array.isArray(data.pages)) {
        for (const pg of data.pages) {
          batch.set(doc(db, 'pages', pg.id), {
            title: pg.title,
            slug: pg.slug,
            contentHtml: pg.contentHtml,
            status: pg.status,
            showInFooter: Boolean(pg.showInFooter),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      await batch.commit();
      await logActivity(currentUser, 'RESTORE_BACKUP', 'system', 'global', `Restored backup from ${file.name}`);
      setMsg('Configuration and structure restored to Firestore.');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Invalid backup JSON file.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Backup, Restore & Firebase Deployment Guide</h1>
        <p className="text-xs text-stone-500 mt-1">
          Export full JSON snapshots of your portal, restore prior configurations, or review Firebase Hosting instructions.
        </p>
      </div>

      {msg && <p className="text-xs text-emerald-600">{msg}</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg space-y-3">
          <h2 className="text-sm font-bold">Export Full Snapshot</h2>
          <p className="text-xs text-stone-500">
            Download articles, categories, menus, pages, ads, and visual builder settings as JSON.
          </p>
          <button
            type="button"
            onClick={handleExportBackup}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
          >
            <Download className="w-4 h-4" /> Download JSON Backup
          </button>
        </div>

        <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg space-y-3">
          <h2 className="text-sm font-bold">Restore from JSON</h2>
          <p className="text-xs text-stone-500">
            Import a previously exported JSON snapshot back into your Firestore database.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleRestoreFile}
            className="hidden"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Upload className="w-4 h-4" /> {busy ? 'Restoring...' : 'Upload & Restore JSON'}
          </button>
        </div>

        <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg space-y-3">
          <h2 className="text-sm font-bold">Initialize Missing Defaults</h2>
          <p className="text-xs text-stone-500">
            If any default categories or initial stories were removed, seed missing baseline items safely.
          </p>
          <button
            type="button"
            onClick={async () => {
              const seeded = await reseedIfEmpty();
              setMsg(seeded ? 'Baseline collections populated.' : 'Database already contains content.');
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <RotateCcw className="w-4 h-4" /> Check & Seed Defaults
          </button>
        </div>
      </div>

      {/* Firebase & Netlify Deployment Guide */}
      <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg space-y-4 text-xs leading-relaxed">
        <h2 className="text-base font-bold">Netlify Free Domain & Firebase Production Deployment Guide</h2>
        <ol className="list-decimal pl-5 space-y-2 text-stone-700 dark:text-stone-300">
          <li>
            <strong>Build Static Bundle for Netlify:</strong> Run <code>npm run build</code> to generate the production <code>dist/</code> folder. <code>netlify.toml</code> and <code>public/_redirects</code> are already configured for SPA routing.
          </li>
          <li>
            <strong>Publish on Netlify Free Domain (<code>*.netlify.app</code>):</strong> Connect your Git repository on Netlify (Build command: <code>npm run build</code>, Publish directory: <code>dist</code>) or drag and drop the <code>dist/</code> folder into Netlify Drop.
          </li>
          <li>
            <strong>REQUIRED in Firebase Console (Authorized Domains):</strong> Open <em>Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains</em> and click <em>Add domain</em> to add your Netlify domain (for example, <code>your-site-name.netlify.app</code>) so Google Sign-In works in the Admin Panel.
          </li>
          <li>
            <strong>Hidden Admin Access:</strong> Public admin buttons are hidden from visitors. Access your control panel anytime by opening <code>https://your-site-name.netlify.app/admin</code> or <code>/admin/login</code> directly in your browser.
          </li>
          <li>
            <strong>Optional Firebase Storage for File Uploads:</strong> On Netlify static hosting, enable <em>Firebase Console &rarr; Build &rarr; Storage</em> (or paste external image URLs) for image uploads inside the Media Library.
          </li>
        </ol>
      </div>
    </div>
  );
}
