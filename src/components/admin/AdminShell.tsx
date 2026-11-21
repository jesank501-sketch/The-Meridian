import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  DatabaseBackup,
  ExternalLink,
  FileText,
  Flame,
  FolderOpen,
  Globe,
  HardDrive,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  Navigation,
  Palette,
  PanelBottom,
  PanelTop,
  PlusCircle,
  Settings,
  Sparkles,
  Tag as TagIcon,
  TrendingUp,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { Link, useRouter } from '../../lib/router';
import type { NewsArticle } from '../../types/portal';
import { AdminOverview } from './AdminOverview';
import { NewsManager } from './NewsManager';
import { NewsEditor } from './NewsEditor';
import { CategoriesTagsManager } from './CategoriesTagsManager';
import { MediaLibraryManager } from './MediaLibraryManager';
import { DesignAndBuilderStudio } from './DesignAndBuilderStudio';
import { MenusAndAdsManager } from './MenusAndAdsManager';
import { PagesAndCommentsManager } from './PagesAndCommentsManager';
import { UsersAndAnalyticsManager } from './UsersAndAnalyticsManager';
import { SettingsAndSeoManager } from './SettingsAndSeoManager';
import { BackupAndGuideManager } from './BackupAndGuideManager';

type AdminTab =
  | 'dashboard'
  | 'all-news'
  | 'add-news'
  | 'categories'
  | 'tags'
  | 'media'
  | 'breaking'
  | 'featured'
  | 'trending'
  | 'homepage-builder'
  | 'website-design'
  | 'theme-customizer'
  | 'header-settings'
  | 'footer-settings'
  | 'menu-manager'
  | 'ads'
  | 'seo'
  | 'pages'
  | 'comments'
  | 'newsletter'
  | 'users'
  | 'analytics'
  | 'backup'
  | 'general-settings'
  | 'profile';

export function AdminShell() {
  const {
    authReady,
    isSyncingProfile,
    currentUser,
    isEditorialStaff,
    logout,
    websiteSettings,
    isSeeding,
    seedWarning,
    reseedIfEmpty,
  } = usePortal();
  const { navigate } = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (authReady && !isSyncingProfile && (!currentUser || !isEditorialStaff)) {
      navigate('/admin/login');
    }
  }, [authReady, isSyncingProfile, currentUser, isEditorialStaff, navigate]);

  if (!authReady || isSyncingProfile || !currentUser || !isEditorialStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 dark:bg-stone-950 text-sm text-stone-500">
        Loading newsroom workspace...
      </div>
    );
  }

  const sidebarItems: Array<{
    id: AdminTab | 'logout';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'all-news', label: 'All News', icon: FileText },
    { id: 'add-news', label: 'Add New News', icon: PlusCircle },
    { id: 'categories', label: 'Categories', icon: FolderOpen },
    { id: 'tags', label: 'Tags', icon: TagIcon },
    { id: 'media', label: 'Media Library', icon: ImageIcon },
    { id: 'breaking', label: 'Breaking News', icon: Flame },
    { id: 'featured', label: 'Featured News', icon: Sparkles },
    { id: 'trending', label: 'Trending News', icon: TrendingUp },
    { id: 'homepage-builder', label: 'Homepage Builder', icon: LayoutTemplate },
    { id: 'website-design', label: 'Website Design', icon: HardDrive },
    { id: 'theme-customizer', label: 'Theme Customizer', icon: Palette },
    { id: 'header-settings', label: 'Header Settings', icon: PanelTop },
    { id: 'footer-settings', label: 'Footer Settings', icon: PanelBottom },
    { id: 'menu-manager', label: 'Menu Manager', icon: Navigation },
    { id: 'ads', label: 'Advertisement Manager', icon: Megaphone },
    { id: 'seo', label: 'SEO Settings', icon: Globe },
    { id: 'pages', label: 'Pages Manager', icon: FileText },
    { id: 'comments', label: 'Comments Manager', icon: MessageSquare },
    { id: 'newsletter', label: 'Newsletter Manager', icon: Mail },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'backup', label: 'Backup & Restore', icon: DatabaseBackup },
    { id: 'general-settings', label: 'General Settings', icon: Settings },
    { id: 'profile', label: 'Profile Settings', icon: UserCog },
    { id: 'logout', label: 'Logout', icon: LogOut },
  ];

  const handleSelectItem = async (id: AdminTab | 'logout') => {
    setMobileSidebarOpen(false);
    if (id === 'logout') {
      await logout();
      navigate('/');
      return;
    }
    if (id === 'add-news') {
      setEditingArticle(null);
    }
    setActiveTab(id);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminOverview onNavigateTab={(tab) => handleSelectItem(tab as AdminTab)} />;
      case 'all-news':
        return (
          <NewsManager
            presetFilter="all"
            onEditArticle={(art) => {
              setEditingArticle(art);
              setActiveTab('add-news');
            }}
            onCreateNew={() => {
              setEditingArticle(null);
              setActiveTab('add-news');
            }}
          />
        );
      case 'breaking':
        return (
          <NewsManager
            presetFilter="breaking"
            onEditArticle={(art) => {
              setEditingArticle(art);
              setActiveTab('add-news');
            }}
            onCreateNew={() => {
              setEditingArticle(null);
              setActiveTab('add-news');
            }}
          />
        );
      case 'featured':
        return (
          <NewsManager
            presetFilter="featured"
            onEditArticle={(art) => {
              setEditingArticle(art);
              setActiveTab('add-news');
            }}
            onCreateNew={() => {
              setEditingArticle(null);
              setActiveTab('add-news');
            }}
          />
        );
      case 'trending':
        return (
          <NewsManager
            presetFilter="trending"
            onEditArticle={(art) => {
              setEditingArticle(art);
              setActiveTab('add-news');
            }}
            onCreateNew={() => {
              setEditingArticle(null);
              setActiveTab('add-news');
            }}
          />
        );
      case 'add-news':
        return (
          <NewsEditor
            initialArticle={editingArticle}
            onDone={() => {
              setEditingArticle(null);
              setActiveTab('all-news');
            }}
          />
        );
      case 'categories':
        return <CategoriesTagsManager mode="categories" />;
      case 'tags':
        return <CategoriesTagsManager mode="tags" />;
      case 'media':
        return <MediaLibraryManager />;
      case 'homepage-builder':
        return <DesignAndBuilderStudio initialTab="homepage" />;
      case 'website-design':
        return <DesignAndBuilderStudio initialTab="cards" />;
      case 'theme-customizer':
        return <DesignAndBuilderStudio initialTab="theme" />;
      case 'header-settings':
        return <DesignAndBuilderStudio initialTab="header" />;
      case 'footer-settings':
        return <DesignAndBuilderStudio initialTab="footer" />;
      case 'menu-manager':
        return <MenusAndAdsManager mode="menus" />;
      case 'ads':
        return <MenusAndAdsManager mode="ads" />;
      case 'seo':
        return <SettingsAndSeoManager mode="seo" />;
      case 'pages':
        return <PagesAndCommentsManager mode="pages" />;
      case 'comments':
        return <PagesAndCommentsManager mode="comments" />;
      case 'newsletter':
        return <PagesAndCommentsManager mode="newsletter" />;
      case 'users':
        return <UsersAndAnalyticsManager mode="users" />;
      case 'analytics':
        return <UsersAndAnalyticsManager mode="analytics" />;
      case 'backup':
        return <BackupAndGuideManager />;
      case 'general-settings':
        return <SettingsAndSeoManager mode="general" />;
      case 'profile':
        return <UsersAndAnalyticsManager mode="profile" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Collapsible Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col transition-transform duration-200 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="px-4 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-editorial-heading font-bold text-base truncate">
              {websiteSettings.siteName}
            </p>
            <p className="text-[11px] text-stone-500 truncate">
              {currentUser.displayName} · {currentUser.role}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1 text-stone-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2.5 space-y-0.5">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectItem(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded transition-colors text-left ${
                  active
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                    : item.id === 'logout'
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 mt-2'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 border border-stone-300 dark:border-stone-700 rounded"
              aria-label="Open admin menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-xs text-stone-500 capitalize">
              Admin / {activeTab.replace(/-/g, ' ')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isSeeding && (
              <span className="text-xs text-amber-700 dark:text-amber-400">
                Initializing database...
              </span>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap shrink-0"
            >
              <span>View Public Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          {seedWarning && (
            <div className="mb-6 p-3.5 border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 rounded text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3">
              <span className="break-words">Initial database seed warning: {seedWarning}</span>
              <button
                type="button"
                onClick={() => reseedIfEmpty()}
                className="px-3 py-1.5 font-semibold border border-amber-400 dark:border-amber-700 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 shrink-0"
              >
                Retry Seed
              </button>
            </div>
          )}
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
