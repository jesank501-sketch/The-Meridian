import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Monitor,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import {
  publishDesignChanges,
  removeHomepageSection,
  reorderHomepageSections,
  restorePreviousDesign,
  saveDesignDraft,
  saveHomepageSection,
  uploadMediaFile,
} from '../../lib/firestoreService';
import { MediaPickerModal } from './MediaLibraryManager';
import { PublicHeader } from '../public/PublicHeader';
import { PublicHomePage } from '../public/PublicHomePage';
import { PublicFooter } from '../public/PublicFooter';
import type {
  DesignSettings,
  HomepageSection,
  SectionLayout,
  SectionType,
  SidebarWidget,
} from '../../types/portal';

type BuilderTab = 'homepage' | 'cards' | 'theme' | 'header' | 'footer';

export function DesignAndBuilderStudio({ initialTab = 'homepage' }: { initialTab?: BuilderTab }) {
  const {
    draftDesign,
    publishedDesign,
    previousDesign,
    draftSections,
    publishedSections,
    categories,
    currentUser,
    isAdmin,
    setPreviewOverrides,
  } = usePortal();

  const [activeTab, setActiveTab] = useState<BuilderTab>(initialTab);
  const [localDesign, setLocalDesign] = useState<DesignSettings>(() =>
    structuredClone(draftDesign)
  );
  const [localSections, setLocalSections] = useState<HomepageSection[]>(() =>
    structuredClone(draftSections)
  );
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'header_logo' | 'footer_logo' | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setLocalDesign(structuredClone(draftDesign));
  }, [draftDesign]);

  useEffect(() => {
    setLocalSections(structuredClone(draftSections));
  }, [draftSections]);

  // Apply live preview overrides while studio is open, and clear on unmount
  useEffect(() => {
    setPreviewOverrides(localDesign, localSections);
    return () => {
      setPreviewOverrides(null, null);
    };
  }, [localDesign, localSections]);

  if (!isAdmin) {
    return (
      <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm">
        Administrator or Super Admin permissions are required to customize website design.
      </div>
    );
  }

  const handleSaveDraft = async () => {
    if (!currentUser) return;
    setBusy(true);
    setStatusMsg('');
    try {
      await saveDesignDraft(localDesign, currentUser);
      for (const sec of localSections) {
        await saveHomepageSection(sec, currentUser);
      }
      setStatusMsg('Draft configuration saved to Firestore.');
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!currentUser) return;
    setBusy(true);
    setStatusMsg('');
    try {
      await saveDesignDraft(localDesign, currentUser);
      await publishDesignChanges(
        localDesign,
        publishedDesign,
        localSections,
        publishedSections,
        currentUser
      );
      setStatusMsg('Published! All live readers now see these design and homepage updates.');
    } finally {
      setBusy(false);
    }
  };

  const handleDiscard = () => {
    setLocalDesign(structuredClone(publishedDesign));
    setLocalSections(
      publishedSections.map((s) => ({
        ...s,
        id: s.id.startsWith('draft-') ? s.id : `draft-${s.id}`,
        scope: 'draft',
      }))
    );
    setStatusMsg('Reverted unsaved edits back to the live published design.');
  };

  const handleRestorePrevious = async () => {
    if (!previousDesign || !currentUser) return;
    setBusy(true);
    try {
      await restorePreviousDesign(previousDesign, currentUser);
      setLocalDesign(structuredClone(previousDesign));
      setStatusMsg('Restored previous design snapshot.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddSection = async () => {
    if (!currentUser) return;
    const newSec: HomepageSection = {
      id: `draft-sec-${Date.now()}`,
      title: 'New Editorial Section',
      sectionType: 'latest',
      categorySlug: categories[0]?.slug || '',
      layout: 'grid',
      articleLimit: 3,
      backgroundColor: '',
      isVisible: true,
      order: localSections.length + 1,
      scope: 'draft',
    };
    const next = [...localSections, newSec];
    setLocalSections(next);
    await saveHomepageSection(newSec, currentUser);
  };

  const moveSection = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= localSections.length) return;
    const next = [...localSections];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    const reindexed = next.map((s, idx) => ({ ...s, order: idx + 1 }));
    setLocalSections(reindexed);
    await reorderHomepageSections(reindexed).catch(() => null);
  };

  const handleDropSection = async (dropIdx: number) => {
    if (draggedIdx === null || draggedIdx === dropIdx) {
      setDraggedIdx(null);
      return;
    }
    const next = [...localSections];
    const [moved] = next.splice(draggedIdx, 1);
    next.splice(dropIdx, 0, moved);
    const reindexed = next.map((s, idx) => ({ ...s, order: idx + 1 }));
    setLocalSections(reindexed);
    setDraggedIdx(null);
    await reorderHomepageSections(reindexed).catch(() => null);
  };

  const handleLogoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'header' | 'footer'
  ) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    const asset = await uploadMediaFile(file, { title: `${target} logo` }, currentUser);
    if (target === 'header') {
      setLocalDesign((prev) => ({ ...prev, header: { ...prev.header, logoUrl: asset.url } }));
    } else {
      setLocalDesign((prev) => ({ ...prev, footer: { ...prev.footer, logoUrl: asset.url } }));
    }
  };

  const moveSidebarWidget = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    const list = [...localDesign.sidebar.widgets];
    if (target < 0 || target >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    setLocalDesign((prev) => ({ ...prev, sidebar: { ...prev.sidebar, widgets: list } }));
  };

  const addSidebarWidget = (type: SidebarWidget['type']) => {
    const titles: Record<SidebarWidget['type'], string> = {
      most_popular: 'Most Popular',
      trending: 'Trending Now',
      newsletter: 'Newsletter Briefing',
      ad_sidebar: 'Sponsored Placement',
      categories: 'Sections Directory',
      weather_edition: 'Edition Desk',
    };
    setLocalDesign((prev) => ({
      ...prev,
      sidebar: {
        ...prev.sidebar,
        widgets: [
          ...prev.sidebar.widgets,
          { id: `w-${Date.now()}`, type, title: titles[type], enabled: true },
        ],
      },
    }));
  };

  const previewWidthCls =
    viewport === 'mobile'
      ? 'w-[375px]'
      : viewport === 'tablet'
      ? 'w-[768px]'
      : 'w-full';

  return (
    <div className="space-y-6">
      {/* Studio Action Toolbar */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['homepage', 'Homepage Builder'],
              ['cards', 'Cards & Sidebar'],
              ['theme', 'Theme Customizer'],
              ['header', 'Header Settings'],
              ['footer', 'Footer Settings'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === key
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLivePreview((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded"
          >
            {showLivePreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showLivePreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          {previousDesign && (
            <button
              type="button"
              disabled={busy}
              onClick={handleRestorePrevious}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restore Previous
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={handleDiscard}
            className="px-3 py-1.5 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded"
          >
            Discard
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded"
          >
            <Save className="w-3.5 h-3.5" /> Save Draft
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handlePublish}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded hover:bg-emerald-800"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> {busy ? 'Publishing...' : 'Publish Changes'}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 rounded">
          {statusMsg}
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-6">
        {activeTab === 'homepage' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Homepage Sections & Drag-and-Drop Builder</h2>
                <p className="text-xs text-stone-500">
                  Drag rows or use arrows to reorder sections. Customize heading, layout, article count, and background.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSection}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
              >
                <Plus className="w-3.5 h-3.5" /> Add Section
              </button>
            </div>

            <div className="space-y-2.5">
              {localSections.map((sec, idx) => (
                <div
                  key={sec.id}
                  draggable
                  onDragStart={() => setDraggedIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropSection(idx)}
                  className={`p-3.5 border rounded-md bg-stone-50 dark:bg-stone-950 flex flex-wrap items-center gap-3 ${
                    draggedIdx === idx
                      ? 'border-stone-900 dark:border-stone-100 opacity-70'
                      : 'border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-stone-400 cursor-grab shrink-0" />

                  <input
                    type="text"
                    value={sec.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalSections((prev) =>
                        prev.map((s) => (s.id === sec.id ? { ...s, title: val } : s))
                      );
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-900 w-44"
                  />

                  <select
                    value={sec.sectionType}
                    onChange={(e) => {
                      const val = e.target.value as SectionType;
                      setLocalSections((prev) =>
                        prev.map((s) => (s.id === sec.id ? { ...s, sectionType: val } : s))
                      );
                    }}
                    className="px-2.5 py-1.5 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-900"
                  >
                    <option value="hero">Hero</option>
                    <option value="featured">Featured</option>
                    <option value="latest">Latest</option>
                    <option value="category">Category</option>
                    <option value="gallery">Photo Gallery</option>
                    <option value="video">Video News</option>
                    <option value="popular">Most Popular</option>
                    <option value="trending">Trending</option>
                    <option value="newsletter">Newsletter</option>
                    <option value="ad_banner">Ad Banner</option>
                    <option value="sponsored_ads">Sponsored & Direct Links Hub</option>
                  </select>

                  {sec.sectionType === 'category' && (
                    <select
                      value={sec.categorySlug || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalSections((prev) =>
                          prev.map((s) => (s.id === sec.id ? { ...s, categorySlug: val } : s))
                        );
                      }}
                      className="px-2.5 py-1.5 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-900"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={sec.layout}
                    onChange={(e) => {
                      const val = e.target.value as SectionLayout;
                      setLocalSections((prev) =>
                        prev.map((s) => (s.id === sec.id ? { ...s, layout: val } : s))
                      );
                    }}
                    className="px-2.5 py-1.5 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-900"
                  >
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                    <option value="magazine">Magazine</option>
                    <option value="hero_split">Hero Split</option>
                  </select>

                  <label className="flex items-center gap-1 text-xs">
                    <span className="text-stone-500">Count:</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={sec.articleLimit}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 3;
                        setLocalSections((prev) =>
                          prev.map((s) => (s.id === sec.id ? { ...s, articleLimit: val } : s))
                        );
                      }}
                      className="w-14 px-2 py-1 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-900 tabular-nums"
                    />
                  </label>

                  <label className="flex items-center gap-1 text-xs">
                    <span className="text-stone-500">Bg:</span>
                    <input
                      type="color"
                      value={sec.backgroundColor || '#ffffff'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalSections((prev) =>
                          prev.map((s) => (s.id === sec.id ? { ...s, backgroundColor: val } : s))
                        );
                      }}
                      className="w-7 h-7 rounded cursor-pointer border-0"
                    />
                  </label>

                  <label className="inline-flex items-center gap-1 text-xs ml-auto">
                    <input
                      type="checkbox"
                      checked={sec.isVisible}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setLocalSections((prev) =>
                          prev.map((s) => (s.id === sec.id ? { ...s, isVisible: checked } : s))
                        );
                      }}
                    />
                    Visible
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSection(idx, -1)}
                      className="p-1 border border-stone-300 dark:border-stone-700 rounded"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(idx, 1)}
                      className="p-1 border border-stone-300 dark:border-stone-700 rounded"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setLocalSections((prev) => prev.filter((s) => s.id !== sec.id));
                        if (currentUser) await removeHomepageSection(sec.id, currentUser).catch(() => null);
                      }}
                      className="p-1 text-red-600 border border-stone-300 dark:border-stone-700 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-base font-bold">News Card Customization</h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-medium mb-1">Default Card Layout</label>
                  <select
                    value={localDesign.cards.defaultLayout}
                    onChange={(e) =>
                      setLocalDesign((prev) => ({
                        ...prev,
                        cards: {
                          ...prev.cards,
                          defaultLayout: e.target.value as 'grid' | 'list' | 'magazine',
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                  >
                    <option value="grid">Grid</option>
                    <option value="list">List</option>
                    <option value="magazine">Magazine</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Image Aspect Ratio</label>
                  <select
                    value={localDesign.cards.imageAspectRatio}
                    onChange={(e) =>
                      setLocalDesign((prev) => ({
                        ...prev,
                        cards: {
                          ...prev.cards,
                          imageAspectRatio: e.target.value as '16/9' | '4/3' | '3/2' | '1/1',
                        },
                      }))
                    }
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                  >
                    <option value="16/9">16:9 Widescreen</option>
                    <option value="4/3">4:3 Classic Press</option>
                    <option value="3/2">3:2 Leica Photo</option>
                    <option value="1/1">1:1 Square</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Title Font Size (px)</label>
                  <input
                    type="number"
                    min={14}
                    max={28}
                    value={localDesign.cards.titleFontSize}
                    onChange={(e) =>
                      setLocalDesign((prev) => ({
                        ...prev,
                        cards: { ...prev.cards, titleFontSize: Number(e.target.value) || 19 },
                      }))
                    }
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Card Border Radius (px)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={localDesign.cards.borderRadius}
                    onChange={(e) =>
                      setLocalDesign((prev) => ({
                        ...prev,
                        cards: { ...prev.cards, borderRadius: Number(e.target.value) || 0 },
                      }))
                    }
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Card Spacing (px)</label>
                  <input
                    type="number"
                    min={12}
                    max={48}
                    value={localDesign.cards.cardSpacing}
                    onChange={(e) =>
                      setLocalDesign((prev) => ({
                        ...prev,
                        cards: { ...prev.cards, cardSpacing: Number(e.target.value) || 24 },
                      }))
                    }
                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Card Background</label>
                  <input
                    type="color"
                    value={localDesign.cards.cardBackground}
                    onChange={(e) =>
                      setLocalDesign((prev) => ({
                        ...prev,
                        cards: { ...prev.cards, cardBackground: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded border border-stone-300 dark:border-stone-700"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold">Sidebar Customization</h2>
                <label className="inline-flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={localDesign.sidebar.enabled}
                    onChange={(e) =>
                      setLocalDesign((prev) => ({
                        ...prev,
                        sidebar: { ...prev.sidebar, enabled: e.target.checked },
                      }))
                    }
                  />
                  Enable Sidebar
                </label>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-medium">Position:</span>
                {(['left', 'right'] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() =>
                      setLocalDesign((prev) => ({
                        ...prev,
                        sidebar: { ...prev.sidebar, position: pos },
                      }))
                    }
                    className={`px-3 py-1.5 rounded border capitalize ${
                      localDesign.sidebar.position === pos
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900'
                        : 'border-stone-300 dark:border-stone-700'
                    }`}
                  >
                    {pos} Sidebar
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                {localDesign.sidebar.widgets.map((w, idx) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 p-2.5 border border-stone-200 dark:border-stone-800 rounded text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={w.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setLocalDesign((prev) => ({
                          ...prev,
                          sidebar: {
                            ...prev.sidebar,
                            widgets: prev.sidebar.widgets.map((item) =>
                              item.id === w.id ? { ...item, enabled: checked } : item
                            ),
                          },
                        }));
                      }}
                    />
                    <input
                      type="text"
                      value={w.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalDesign((prev) => ({
                          ...prev,
                          sidebar: {
                            ...prev.sidebar,
                            widgets: prev.sidebar.widgets.map((item) =>
                              item.id === w.id ? { ...item, title: val } : item
                            ),
                          },
                        }));
                      }}
                      className="flex-1 px-2 py-1 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                    />
                    <button
                      type="button"
                      onClick={() => moveSidebarWidget(idx, -1)}
                      className="p-1 border border-stone-300 dark:border-stone-700 rounded"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSidebarWidget(idx, 1)}
                      className="p-1 border border-stone-300 dark:border-stone-700 rounded"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLocalDesign((prev) => ({
                          ...prev,
                          sidebar: {
                            ...prev.sidebar,
                            widgets: prev.sidebar.widgets.filter((item) => item.id !== w.id),
                          },
                        }))
                      }
                      className="p-1 text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(['most_popular', 'trending', 'newsletter', 'ad_sidebar', 'categories'] as const).map(
                  (wt) => (
                    <button
                      key={wt}
                      type="button"
                      onClick={() => addSidebarWidget(wt)}
                      className="px-2.5 py-1 text-[11px] border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      + {wt.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            <div>
              <label className="block font-medium mb-1">Color Mode</label>
              <div className="flex gap-2">
                {(['light', 'dark'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() =>
                      setLocalDesign((prev) => ({ ...prev, theme: { ...prev.theme, mode: m } }))
                    }
                    className={`flex-1 py-2 rounded border capitalize font-semibold ${
                      localDesign.theme.mode === m
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900'
                        : 'border-stone-300 dark:border-stone-700'
                    }`}
                  >
                    {m} Mode
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">Primary Accent Color</label>
              <input
                type="color"
                value={localDesign.theme.primaryColor}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, primaryColor: e.target.value },
                  }))
                }
                className="w-full h-9 rounded border border-stone-300 dark:border-stone-700"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Secondary Color</label>
              <input
                type="color"
                value={localDesign.theme.secondaryColor}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, secondaryColor: e.target.value },
                  }))
                }
                className="w-full h-9 rounded border border-stone-300 dark:border-stone-700"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Light Background Color</label>
              <input
                type="color"
                value={localDesign.theme.backgroundColor}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, backgroundColor: e.target.value },
                  }))
                }
                className="w-full h-9 rounded border border-stone-300 dark:border-stone-700"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Body Text Color</label>
              <input
                type="color"
                value={localDesign.theme.textColor}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, textColor: e.target.value },
                  }))
                }
                className="w-full h-9 rounded border border-stone-300 dark:border-stone-700"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Base Font Size (px)</label>
              <input
                type="number"
                min={14}
                max={20}
                value={localDesign.theme.baseFontSize}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, baseFontSize: Number(e.target.value) || 16 },
                  }))
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 tabular-nums"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Heading Typography</label>
              <select
                value={localDesign.theme.headingFont}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, headingFont: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              >
                <option value='"Playfair Display", Georgia, serif'>Playfair Display (Broadsheet Serif)</option>
                <option value='"Fraunces", Georgia, serif'>Fraunces (Editorial Display)</option>
                <option value='"Cormorant Garamond", Georgia, serif'>Cormorant Garamond (Classic)</option>
                <option value='"Plus Jakarta Sans", system-ui, sans-serif'>Plus Jakarta Sans (Modern)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Body Prose Typography</label>
              <select
                value={localDesign.theme.bodyFont}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, bodyFont: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              >
                <option value='"Source Serif 4", Georgia, serif'>Source Serif 4 (Newspaper Book)</option>
                <option value='"Lora", Georgia, serif'>Lora (Editorial Prose)</option>
                <option value='"DM Sans", system-ui, sans-serif'>DM Sans (Crisp Sans)</option>
                <option value='"Manrope", system-ui, sans-serif'>Manrope (Clean UI)</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Border Style</label>
              <select
                value={localDesign.theme.borderStyle}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    theme: {
                      ...prev.theme,
                      borderStyle: e.target.value as 'hairline' | 'solid' | 'none',
                    },
                  }))
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              >
                <option value="hairline">Hairline Dividers</option>
                <option value="solid">Solid Borders</option>
                <option value="none">Borderless</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'header' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
            <div>
              <label className="block font-medium mb-1">Masthead Wordmark Text</label>
              <input
                type="text"
                value={localDesign.header.logoText}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    header: { ...prev.header, logoText: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium mb-1">Header Logo Image (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localDesign.header.logoUrl}
                  onChange={(e) =>
                    setLocalDesign((prev) => ({
                      ...prev,
                      header: { ...prev.header, logoUrl: e.target.value },
                    }))
                  }
                  placeholder="Leave blank to render serif masthead typography"
                  className="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                />
                <label className="inline-flex items-center gap-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, 'header')}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setPickerTarget('header_logo')}
                  className="inline-flex items-center gap-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Library
                </button>
              </div>
            </div>
            <div>
              <label className="block font-medium mb-1">Logo Width (px)</label>
              <input
                type="number"
                value={localDesign.header.logoWidth}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    header: { ...prev.header, logoWidth: Number(e.target.value) || 180 },
                  }))
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 tabular-nums"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Header Height (px)</label>
              <input
                type="number"
                value={localDesign.header.headerHeight}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    header: { ...prev.header, headerHeight: Number(e.target.value) || 76 },
                  }))
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 tabular-nums"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Header Background Color</label>
              <input
                type="color"
                value={localDesign.header.headerBg}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    header: { ...prev.header, headerBg: e.target.value },
                  }))
                }
                className="w-full h-9 rounded border border-stone-300 dark:border-stone-700"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Navigation Position</label>
              <select
                value={localDesign.header.navPosition}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    header: {
                      ...prev.header,
                      navPosition: e.target.value as 'left' | 'center' | 'below',
                    },
                  }))
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              >
                <option value="below">Centered Broadsheet Bar Below Masthead</option>
                <option value="left">Inline Left Navigation</option>
                <option value="center">Inline Center Navigation</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-6 pt-4">
              <label className="inline-flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={localDesign.header.enableTopBar}
                  onChange={(e) =>
                    setLocalDesign((prev) => ({
                      ...prev,
                      header: { ...prev.header, enableTopBar: e.target.checked },
                    }))
                  }
                />
                Enable Top Information Bar
              </label>
              <label className="inline-flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={localDesign.header.showSocialIcons}
                  onChange={(e) =>
                    setLocalDesign((prev) => ({
                      ...prev,
                      header: { ...prev.header, showSocialIcons: e.target.checked },
                    }))
                  }
                />
                Show Social Links
              </label>
              <label className="inline-flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={localDesign.header.showBreakingTicker}
                  onChange={(e) =>
                    setLocalDesign((prev) => ({
                      ...prev,
                      header: { ...prev.header, showBreakingTicker: e.target.checked },
                    }))
                  }
                />
                Show Breaking News Ticker
              </label>
            </div>
          </div>
        )}

        {activeTab === 'footer' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-medium mb-1">Footer Design Layout</label>
              <select
                value={localDesign.footer.design}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    footer: {
                      ...prev.footer,
                      design: e.target.value as
                        | 'editorial_columns'
                        | 'minimal_centered'
                        | 'classic_broadsheet',
                    },
                  }))
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              >
                <option value="editorial_columns">Editorial Multi-Column</option>
                <option value="classic_broadsheet">Classic Broadsheet</option>
                <option value="minimal_centered">Minimal Centered</option>
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Footer Background Color</label>
              <input
                type="color"
                value={localDesign.footer.footerBg}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, footerBg: e.target.value },
                  }))
                }
                className="w-full h-9 rounded border border-stone-300 dark:border-stone-700"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium mb-1">Footer Logo URL (Optional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={localDesign.footer.logoUrl}
                  onChange={(e) =>
                    setLocalDesign((prev) => ({
                      ...prev,
                      footer: { ...prev.footer, logoUrl: e.target.value },
                    }))
                  }
                  className="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
                />
                <label className="inline-flex items-center gap-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleLogoUpload(e, 'footer')}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setPickerTarget('footer_logo')}
                  className="inline-flex items-center gap-1 px-3 py-2 border border-stone-300 dark:border-stone-700 rounded"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Library
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-medium mb-1">Footer Editorial Colophon Text</label>
              <textarea
                rows={3}
                value={localDesign.footer.footerText}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, footerText: e.target.value },
                  }))
                }
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
              />
            </div>
            <label className="inline-flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={localDesign.footer.showSocialLinks}
                onChange={(e) =>
                  setLocalDesign((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, showSocialLinks: e.target.checked },
                  }))
                }
              />
              Show Social Links in Footer
            </label>
          </div>
        )}
      </div>

      {/* Live Interactive Website Preview Viewport */}
      {showLivePreview && (
        <div className="bg-stone-200 dark:bg-stone-950 border border-stone-300 dark:border-stone-800 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Live Website Preview (Draft Changes Reflected Instantly)
            </span>
            <div className="flex items-center gap-1 bg-white dark:bg-stone-900 p-1 rounded border border-stone-300 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded ${
                  viewport === 'desktop'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : ''
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setViewport('tablet')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded ${
                  viewport === 'tablet'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : ''
                }`}
              >
                <Tablet className="w-3.5 h-3.5" /> Tablet
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded ${
                  viewport === 'mobile'
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : ''
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
            </div>
          </div>

          <div className="overflow-x-auto flex justify-center">
            <div
              className={`${previewWidthCls} max-h-[640px] overflow-y-auto border border-stone-300 dark:border-stone-700 rounded shadow-sm transition-all duration-200`}
              style={{
                backgroundColor:
                  localDesign.theme.mode === 'dark' ? '#0c0a09' : localDesign.theme.backgroundColor,
                color: localDesign.theme.mode === 'dark' ? '#f5f5f4' : localDesign.theme.textColor,
              }}
            >
              <PublicHeader />
              <PublicHomePage />
              <PublicFooter />
            </div>
          </div>
        </div>
      )}

      <MediaPickerModal
        open={pickerTarget !== null}
        onSelect={(asset) => {
          if (pickerTarget === 'header_logo') {
            setLocalDesign((prev) => ({
              ...prev,
              header: { ...prev.header, logoUrl: asset.url },
            }));
          } else if (pickerTarget === 'footer_logo') {
            setLocalDesign((prev) => ({
              ...prev,
              footer: { ...prev.footer, logoUrl: asset.url },
            }));
          }
        }}
        onClose={() => setPickerTarget(null)}
      />
    </div>
  );
}
