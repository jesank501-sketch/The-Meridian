import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Code2,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  PauseCircle,
  PlayCircle,
  Plus,
  Trash2,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import {
  removeAdvertisement,
  saveAdvertisement,
} from '../../lib/firestoreService';
import { auth } from '../../lib/firebase';
import { MediaPickerModal } from './MediaLibraryManager';
import { AdSlot } from '../common/AdSlot';
import type {
  AdNetwork,
  AdPlacement,
  AdSize,
  AdType,
  Advertisement,
} from '../../types/portal';

type FilterTab = 'all' | 'adsterra' | 'monetag' | 'adsense' | 'custom';

const PLACEMENT_META: Array<{ id: AdPlacement; label: string; desc: string }> = [
  {
    id: 'sponsored_section',
    label: 'Dedicated Ads Section (All Sponsored Ads)',
    desc: 'Renders every active ad together in a dedicated Sponsored & Partner Ads section on the site.',
  },
  {
    id: 'header',
    label: 'Header Top Banner',
    desc: 'Appears inside the top masthead area across all public pages.',
  },
  {
    id: 'homepage_banner',
    label: 'Homepage Mid-Page Banner',
    desc: 'Appears in the Homepage Builder "Ad Banner" slot.',
  },
  {
    id: 'sidebar',
    label: 'Sidebar Widget',
    desc: 'Displays inside the public reading & homepage sidebar.',
  },
  {
    id: 'article',
    label: 'In-Article Placement',
    desc: 'Displays below article body before related stories.',
  },
  {
    id: 'footer',
    label: 'Footer Banner',
    desc: 'Displays across the top of the public footer.',
  },
];

function extractHttpsScriptUrl(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  // If admin pasted a <script src="https://..."> snippet, extract src automatically
  const srcMatch = trimmed.match(/src\s*=\s*["'](https:\/\/[^"']+)["']/i);
  if (srcMatch?.[1]) {
    return srcMatch[1].trim();
  }
  return trimmed;
}

function getAdNetworkBadge(ad: Advertisement): string {
  if (ad.adType === 'adsterra_direct') return 'Adsterra Direct Link';
  if (ad.adType === 'monetag_direct') return 'Monetag Direct Link';
  if (ad.adType === 'ad_script') {
    if (ad.network === 'adsterra') return 'Adsterra Script Zone';
    if (ad.network === 'monetag') return 'Monetag Script Zone';
    return 'HTTPS Script Zone';
  }
  if (ad.adType === 'adsense') return 'Google AdSense';
  return 'Custom Image Banner';
}

function matchesFilter(ad: Advertisement, tab: FilterTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'adsterra') return ad.adType === 'adsterra_direct' || ad.network === 'adsterra';
  if (tab === 'monetag') return ad.adType === 'monetag_direct' || ad.network === 'monetag';
  if (tab === 'adsense') return ad.adType === 'adsense' || ad.network === 'adsense';
  return ad.adType === 'image' || (ad.adType === 'ad_script' && ad.network === 'custom');
}

export function AdsManager() {
  const { advertisements, currentUser } = usePortal();

  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [editingAd, setEditingAd] = useState<Partial<Advertisement> | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const counts = useMemo(
    () => ({
      all: advertisements.length,
      adsterra: advertisements.filter((a) => matchesFilter(a, 'adsterra')).length,
      monetag: advertisements.filter((a) => matchesFilter(a, 'monetag')).length,
      adsense: advertisements.filter((a) => matchesFilter(a, 'adsense')).length,
      custom: advertisements.filter((a) => matchesFilter(a, 'custom')).length,
    }),
    [advertisements]
  );

  const visibleAds = useMemo(
    () => advertisements.filter((a) => matchesFilter(a, filterTab)),
    [advertisements, filterTab]
  );

  const openPreset = (
    adType: AdType,
    network: AdNetwork,
    placement: AdPlacement = 'sponsored_section'
  ) => {
    setErr('');
    setMsg('');
    setEditingAd({
      title:
        adType === 'adsterra_direct'
          ? 'Featured Sponsored Partner'
          : adType === 'monetag_direct'
          ? 'Recommended Partner Offer'
          : '',
      placement,
      adType,
      network,
      imageUrl: '',
      targetUrl: '',
      ctaText:
        adType === 'adsterra_direct'
          ? 'Visit Partner'
          : adType === 'monetag_direct'
          ? 'Explore Offer'
          : 'Learn More',
      description: '',
      scriptUrl: '',
      adSize: placement === 'header' ? '728x90' : placement === 'sidebar' ? '300x250' : 'responsive',
      openInNewTab: true,
      adsenseClientId: '',
      adsenseSlotId: '',
      startDate: '',
      endDate: '',
      isActive: true,
      clicks: 0,
    });
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd || !currentUser) return;
    setErr('');
    setMsg('');

    const adType = (editingAd.adType as AdType) || 'image';

    if (adType === 'adsterra_direct' || adType === 'monetag_direct') {
      const url = (editingAd.targetUrl || '').trim();
      if (!/^https?:\/\/.+/i.test(url)) {
        setErr('Please paste a valid Direct Link URL starting with https:// or http://');
        return;
      }
    }

    if (adType === 'ad_script') {
      const extracted = extractHttpsScriptUrl(editingAd.scriptUrl || '');
      if (!/^https:\/\/.+/i.test(extracted)) {
        setErr(
          'Script Zone URL must start with https:// (you can paste your full <script src="https://..."> tag and the HTTPS URL will be extracted automatically).'
        );
        return;
      }
      editingAd.scriptUrl = extracted;
    }

    setBusy(true);
    try {
      if (adType === 'adsense') {
        const clientId = (editingAd.adsenseClientId || '').trim();
        const slotId = (editingAd.adsenseSlotId || '').trim();
        if (!/^ca-pub-\d{10,20}$/.test(clientId)) {
          setErr('Publisher ID must match ca-pub-XXXXXXXXXXXXXXXX (10-20 digits).');
          setBusy(false);
          return;
        }
        if (!/^\d{6,15}$/.test(slotId)) {
          setErr('Ad Slot ID must be 6-15 digits.');
          setBusy(false);
          return;
        }
        const token = await auth.currentUser?.getIdToken().catch(() => null);
        if (token) {
          const resp = await fetch('/api/adsense/validate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ clientId, slotId }),
          }).catch(() => null);
          const contentType = resp?.headers.get('content-type') || '';
          if (resp && contentType.includes('application/json')) {
            const data = (await resp.json()) as { valid?: boolean; error?: string };
            if (!resp.ok || !data.valid) {
              setErr(data.error || 'Invalid AdSense identifiers.');
              setBusy(false);
              return;
            }
          }
        }
      }

      const inferredNetwork: AdNetwork =
        adType === 'adsterra_direct'
          ? 'adsterra'
          : adType === 'monetag_direct'
          ? 'monetag'
          : adType === 'adsense'
          ? 'adsense'
          : editingAd.network || 'custom';

      await saveAdvertisement(
        {
          id: editingAd.id,
          title: editingAd.title || 'Sponsored Unit',
          placement: (editingAd.placement as AdPlacement) || 'sponsored_section',
          adType,
          network: inferredNetwork,
          imageUrl: editingAd.imageUrl || '',
          targetUrl: editingAd.targetUrl || '',
          ctaText: editingAd.ctaText || '',
          description: editingAd.description || '',
          scriptUrl: editingAd.scriptUrl || '',
          adSize: (editingAd.adSize as AdSize) || 'responsive',
          openInNewTab: editingAd.openInNewTab ?? true,
          adsenseClientId: editingAd.adsenseClientId || '',
          adsenseSlotId: editingAd.adsenseSlotId || '',
          startDate: editingAd.startDate || '',
          endDate: editingAd.endDate || '',
          isActive: editingAd.isActive ?? true,
          clicks: editingAd.clicks ?? 0,
        },
        currentUser
      );
      setEditingAd(null);
      setMsg('Advertisement saved and published live.');
    } catch (saveErr) {
      setErr(saveErr instanceof Error ? saveErr.message : 'Could not save advertisement.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (ad: Advertisement) => {
    if (!currentUser) return;
    setErr('');
    setMsg('');
    await saveAdvertisement(
      {
        ...ad,
        isActive: !ad.isActive,
      },
      currentUser
    );
    setMsg(`"${ad.title}" ${!ad.isActive ? 'activated' : 'paused'}.`);
  };

  const previewUnit: Advertisement | null = useMemo(() => {
    if (!editingAd) return null;
    return {
      id: editingAd.id || 'preview',
      title: editingAd.title || 'Sponsored Offer Preview',
      placement: (editingAd.placement as AdPlacement) || 'sponsored_section',
      adType: (editingAd.adType as AdType) || 'adsterra_direct',
      network: editingAd.network,
      imageUrl: editingAd.imageUrl || '',
      targetUrl: editingAd.targetUrl || 'https://example.com',
      ctaText: editingAd.ctaText || 'Visit Partner',
      description: editingAd.description || '',
      scriptUrl: extractHttpsScriptUrl(editingAd.scriptUrl || ''),
      adSize: (editingAd.adSize as AdSize) || 'responsive',
      adsenseClientId: editingAd.adsenseClientId,
      adsenseSlotId: editingAd.adsenseSlotId,
      isActive: true,
      clicks: editingAd.clicks || 0,
    };
  }, [editingAd]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Network Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ads & Monetization Center</h1>
          <p className="text-xs text-stone-500 mt-1">
            Add Adsterra Direct Links, Monetag Direct Links, Banner Script Zones, Google AdSense, and Custom Sponsors across all sections.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openPreset('adsterra_direct', 'adsterra', 'sponsored_section')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-800 text-white rounded hover:opacity-90"
          >
            <Link2 className="w-3.5 h-3.5" /> + Adsterra Direct Link
          </button>
          <button
            type="button"
            onClick={() => openPreset('monetag_direct', 'monetag', 'sponsored_section')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded hover:opacity-90"
          >
            <Link2 className="w-3.5 h-3.5" /> + Monetag Direct Link
          </button>
          <button
            type="button"
            onClick={() => openPreset('ad_script', 'adsterra', 'homepage_banner')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Code2 className="w-3.5 h-3.5" /> + Script Zone
          </button>
          <button
            type="button"
            onClick={() => openPreset('image', 'custom', 'homepage_banner')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Plus className="w-3.5 h-3.5" /> Custom Banner / AdSense
          </button>
        </div>
      </div>

      {err && (
        <div className="p-3 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 rounded text-xs text-red-700 dark:text-red-300">
          {err}
        </div>
      )}
      {msg && (
        <div className="p-3 border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 rounded text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Editor Form + Live Preview */}
      {editingAd && (
        <form
          onSubmit={handleSaveAd}
          className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg space-y-5 text-xs"
        >
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-3">
            <h2 className="text-sm font-bold">
              {editingAd.id ? 'Edit Ad Unit' : 'Create New Ad Unit'}
            </h2>
            <span className="text-[11px] font-mono text-stone-500">
              Format: {editingAd.adType}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium mb-1">Ad Format / Network</label>
              <select
                value={editingAd.adType || 'adsterra_direct'}
                onChange={(e) => {
                  const nextType = e.target.value as AdType;
                  const nextNet: AdNetwork =
                    nextType === 'adsterra_direct'
                      ? 'adsterra'
                      : nextType === 'monetag_direct'
                      ? 'monetag'
                      : nextType === 'adsense'
                      ? 'adsense'
                      : editingAd.network === 'adsterra' || editingAd.network === 'monetag'
                      ? editingAd.network
                      : 'custom';
                  setEditingAd({ ...editingAd, adType: nextType, network: nextNet });
                }}
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              >
                <option value="adsterra_direct">Adsterra Direct Link (Smartlink)</option>
                <option value="monetag_direct">Monetag Direct Link (Smartlink)</option>
                <option value="ad_script">Adsterra / Monetag Script Zone (HTTPS)</option>
                <option value="image">Custom Image Banner & Link</option>
                <option value="adsense">Google AdSense Unit</option>
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">Website Placement</label>
              <select
                value={editingAd.placement || 'sponsored_section'}
                onChange={(e) =>
                  setEditingAd({ ...editingAd, placement: e.target.value as AdPlacement })
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              >
                {PLACEMENT_META.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium mb-1">Campaign / Headline Title</label>
              <input
                type="text"
                required
                value={editingAd.title || ''}
                onChange={(e) => setEditingAd({ ...editingAd, title: e.target.value })}
                placeholder="e.g. Featured Technology Offer"
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
          </div>

          {/* Format-Specific Fields */}
          {(editingAd.adType === 'adsterra_direct' || editingAd.adType === 'monetag_direct') && (
            <div className="space-y-4 p-4 rounded border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50">
              <div>
                <label className="block font-semibold mb-1">
                  {editingAd.adType === 'adsterra_direct'
                    ? 'Adsterra Direct Link URL'
                    : 'Monetag Direct Link URL'}
                </label>
                <input
                  type="url"
                  required
                  value={editingAd.targetUrl || ''}
                  onChange={(e) => setEditingAd({ ...editingAd, targetUrl: e.target.value })}
                  placeholder={
                    editingAd.adType === 'adsterra_direct'
                      ? 'https://www.profitablecpmrate.com/xxxxxxxx?key=...'
                      : 'https://otieu.com/4/xxxxxxx'
                  }
                  className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 font-mono"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Paste your Direct Link URL straight from your{' '}
                  {editingAd.adType === 'adsterra_direct' ? 'Adsterra' : 'Monetag'} dashboard. Clicks are tracked automatically and open safely in a new tab.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Button / CTA Label</label>
                  <input
                    type="text"
                    value={editingAd.ctaText || ''}
                    onChange={(e) => setEditingAd({ ...editingAd, ctaText: e.target.value })}
                    placeholder="Visit Partner"
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">
                    Optional Banner Image URL (Leave blank for text card)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingAd.imageUrl || ''}
                      onChange={(e) => setEditingAd({ ...editingAd, imageUrl: e.target.value })}
                      placeholder="https://... or choose from library"
                      className="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                    />
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="inline-flex items-center gap-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> Library
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Short Promotional Note (Optional)</label>
                <input
                  type="text"
                  maxLength={240}
                  value={editingAd.description || ''}
                  onChange={(e) => setEditingAd({ ...editingAd, description: e.target.value })}
                  placeholder="Optional 1-line description shown under the sponsored headline"
                  className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                />
              </div>
            </div>
          )}

          {editingAd.adType === 'ad_script' && (
            <div className="space-y-4 p-4 rounded border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Ad Network</label>
                  <select
                    value={editingAd.network || 'adsterra'}
                    onChange={(e) =>
                      setEditingAd({ ...editingAd, network: e.target.value as AdNetwork })
                    }
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                  >
                    <option value="adsterra">Adsterra</option>
                    <option value="monetag">Monetag</option>
                    <option value="custom">Other Ad Network</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Ad Container Size</label>
                  <select
                    value={editingAd.adSize || 'responsive'}
                    onChange={(e) =>
                      setEditingAd({ ...editingAd, adSize: e.target.value as AdSize })
                    }
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                  >
                    <option value="responsive">Responsive (100% × 250px)</option>
                    <option value="728x90">Leaderboard (728 × 90)</option>
                    <option value="300x250">Medium Rectangle (300 × 250)</option>
                    <option value="320x50">Mobile Banner (320 × 50)</option>
                    <option value="468x60">Standard Banner (468 × 60)</option>
                    <option value="160x600">Wide Skyscraper (160 × 600)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Script Source URL (or paste &lt;script src=&quot;https://...&quot;&gt;)
                </label>
                <input
                  type="text"
                  required
                  value={editingAd.scriptUrl || ''}
                  onChange={(e) =>
                    setEditingAd({
                      ...editingAd,
                      scriptUrl: extractHttpsScriptUrl(e.target.value),
                    })
                  }
                  placeholder="https://pl2345678.profitablecpmrate.com/xx/xx/xx/invoke.js"
                  className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 font-mono"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Paste your Adsterra / Monetag HTTPS script URL (or full &lt;script src=&quot;https://...&quot;&gt; tag). Executed inside a sandboxed iframe for portal security.
                </p>
              </div>
            </div>
          )}

          {editingAd.adType === 'adsense' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">AdSense Publisher ID (ca-pub-...)</label>
                <input
                  type="text"
                  required
                  value={editingAd.adsenseClientId || ''}
                  onChange={(e) => setEditingAd({ ...editingAd, adsenseClientId: e.target.value })}
                  placeholder="ca-pub-1234567890123456"
                  className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Ad Slot ID (Digits)</label>
                <input
                  type="text"
                  required
                  value={editingAd.adsenseSlotId || ''}
                  onChange={(e) => setEditingAd({ ...editingAd, adsenseSlotId: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 font-mono"
                />
              </div>
            </div>
          )}

          {editingAd.adType === 'image' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Creative Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={editingAd.imageUrl || ''}
                    onChange={(e) => setEditingAd({ ...editingAd, imageUrl: e.target.value })}
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
                <label className="block font-medium mb-1">Destination Target URL</label>
                <input
                  type="text"
                  value={editingAd.targetUrl || ''}
                  onChange={(e) => setEditingAd({ ...editingAd, targetUrl: e.target.value })}
                  placeholder="https://sponsor.example.com"
                  className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block font-medium mb-1">Start Date (Optional)</label>
              <input
                type="date"
                value={editingAd.startDate || ''}
                onChange={(e) => setEditingAd({ ...editingAd, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Expiry Date (Optional)</label>
              <input
                type="date"
                value={editingAd.endDate || ''}
                onChange={(e) => setEditingAd({ ...editingAd, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <label className="inline-flex items-center gap-2 font-medium pt-5">
              <input
                type="checkbox"
                checked={editingAd.isActive ?? true}
                onChange={(e) => setEditingAd({ ...editingAd, isActive: e.target.checked })}
              />
              Active Campaign
            </label>
          </div>

          {/* Live Unit Preview */}
          {previewUnit && (
            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                Live Website Preview
              </p>
              <AdSlot placement={previewUnit.placement} previewAd={previewUnit} />
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
            >
              {busy ? 'Saving...' : 'Save & Publish Ad'}
            </button>
            <button
              type="button"
              onClick={() => setEditingAd(null)}
              className="px-4 py-2 border border-stone-300 dark:border-stone-700 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Placement Map Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {PLACEMENT_META.map((slot) => {
          const activeCount = advertisements.filter(
            (a) => a.placement === slot.id && a.isActive
          ).length;
          return (
            <div
              key={slot.id}
              className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {slot.label}
                  </h3>
                  <span className="text-[11px] font-mono tabular-nums text-stone-500">
                    {activeCount} active
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{slot.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openPreset('adsterra_direct', 'adsterra', slot.id)}
                  className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 hover:underline"
                >
                  + Adsterra
                </button>
                <span className="text-stone-300 dark:text-stone-700">·</span>
                <button
                  type="button"
                  onClick={() => openPreset('monetag_direct', 'monetag', slot.id)}
                  className="text-[11px] font-semibold text-stone-800 dark:text-stone-200 hover:underline"
                >
                  + Monetag
                </button>
                <span className="text-stone-300 dark:text-stone-700">·</span>
                <button
                  type="button"
                  onClick={() => openPreset('image', 'custom', slot.id)}
                  className="text-[11px] text-stone-500 hover:underline"
                >
                  + Banner
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
        {(
          [
            ['all', `All Ads (${counts.all})`],
            ['adsterra', `Adsterra (${counts.adsterra})`],
            ['monetag', `Monetag (${counts.monetag})`],
            ['adsense', `AdSense (${counts.adsense})`],
            ['custom', `Custom Banners (${counts.custom})`],
          ] as Array<[FilterTab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterTab(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              filterTab === key
                ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Ads Inventory Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500">
            <tr>
              <th className="py-3 px-4">Campaign / Ad</th>
              <th className="py-3 px-4">Network & Format</th>
              <th className="py-3 px-4">Placement</th>
              <th className="py-3 px-4">Link / Zone</th>
              <th className="py-3 px-4 text-right">Clicks</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {visibleAds.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 px-4 text-center text-xs text-stone-500">
                  No ads in this filter yet. Click &quot;+ Adsterra Direct Link&quot; or &quot;+ Monetag Direct Link&quot; above to add one.
                </td>
              </tr>
            ) : (
              visibleAds.map((ad) => {
                const linkOrScript = ad.targetUrl || ad.scriptUrl || ad.adsenseClientId || '—';
                return (
                  <tr key={ad.id}>
                    <td className="py-3 px-4">
                      <p className="font-medium text-stone-900 dark:text-stone-100">
                        {ad.title}
                      </p>
                      {!ad.isActive && (
                        <span className="text-[11px] text-amber-700 dark:text-amber-400">
                          Paused
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">{getAdNetworkBadge(ad)}</td>
                    <td className="py-3 px-4 text-xs capitalize">
                      {ad.placement.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-stone-500 max-w-[240px] truncate">
                      {ad.targetUrl ? (
                        <a
                          href={ad.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          <span className="truncate max-w-[200px]">{ad.targetUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        linkOrScript
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                      {(ad.clicks || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(ad)}
                        title={ad.isActive ? 'Pause Ad' : 'Activate Ad'}
                        className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900"
                      >
                        {ad.isActive ? (
                          <PauseCircle className="w-4 h-4" />
                        ) : (
                          <PlayCircle className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAd(ad)}
                        title="Edit Ad"
                        className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => currentUser && removeAdvertisement(ad.id, currentUser)}
                        title="Delete Ad"
                        className="p-1.5 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onSelect={(asset) =>
          setEditingAd((prev) => (prev ? { ...prev, imageUrl: asset.url } : prev))
        }
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
