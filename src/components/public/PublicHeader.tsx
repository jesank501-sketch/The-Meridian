import React, { useState } from 'react';
import { Menu, Search, X, Globe } from 'lucide-react';
import { Link, useRouter } from '../../lib/router';
import { usePortal } from '../../context/PortalContext';
import { SafeImage } from '../common/SafeImage';
import { AdSlot } from '../common/AdSlot';

export function PublicHeader() {
  const {
    websiteSettings,
    publishedDesign,
    navMenus,
    publishedArticles,
  } = usePortal();
  const { navigate } = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const headerCfg = publishedDesign.header;
  const theme = publishedDesign.theme;
  const isDark = theme.mode === 'dark';

  const topbarLinks = navMenus.filter((m) => m.location === 'topbar' && m.isActive);
  const headerLinks = navMenus.filter((m) => m.location === 'header' && m.isActive);
  const breakingItems = publishedArticles.filter((a) => a.isBreaking);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
    setSearchOpen(false);
  };

  const socialEntries = Object.entries(websiteSettings.socialLinks || {}).filter(
    ([, val]) => Boolean(val && val.trim())
  );

  return (
    <header
      className="border-b border-stone-200 dark:border-stone-800 transition-colors"
      style={{
        backgroundColor: isDark ? '#12100e' : headerCfg.headerBg || '#ffffff',
      }}
    >
      {/* 1. Top Information Bar */}
      {headerCfg.enableTopBar && (
        <div className="border-b border-stone-200/80 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs text-stone-600 dark:text-stone-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-medium text-stone-800 dark:text-stone-200">{todayFormatted}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {websiteSettings.editionLabel || 'International Edition'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {topbarLinks.map((item) => (
                <Link
                  key={item.id}
                  to={item.url}
                  className="hover:text-stone-900 dark:hover:text-stone-100 whitespace-nowrap shrink-0"
                >
                  {item.label}
                </Link>
              ))}
              {headerCfg.showSocialIcons && socialEntries.length > 0 && (
                <div className="hidden sm:flex items-center gap-2.5 border-l border-stone-300 dark:border-stone-700 pl-3">
                  {socialEntries.slice(0, 4).map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="capitalize hover:text-stone-900 dark:hover:text-stone-100"
                    >
                      {platform}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header Ad Placement */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 empty:hidden">
        <AdSlot placement="header" />
      </div>

      {/* 2. Main Masthead & Branding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          className={`flex items-center justify-between gap-6 py-4 ${
            headerCfg.navPosition === 'center' ? 'md:justify-center md:relative' : ''
          }`}
          style={{ minHeight: `${headerCfg.headerHeight || 76}px` }}
        >
          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="p-2 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <Link
            to="/"
            className={`flex items-center gap-3 shrink-0 ${
              headerCfg.navPosition === 'below' ? 'mx-auto md:mx-0' : ''
            }`}
          >
            {headerCfg.logoUrl ? (
              <SafeImage
                src={headerCfg.logoUrl}
                alt={headerCfg.logoText || websiteSettings.siteName}
                fallbackTitle={headerCfg.logoText || websiteSettings.siteName}
                className="object-contain"
                style={{
                  width: `${headerCfg.logoWidth || 180}px`,
                  height: `${headerCfg.logoHeight || 40}px`,
                }}
              />
            ) : (
              <span className="font-editorial-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 whitespace-nowrap">
                {headerCfg.logoText || websiteSettings.siteName}
              </span>
            )}
          </Link>

          {headerCfg.navPosition !== 'below' && (
            <nav className="hidden lg:flex items-center gap-6 overflow-x-auto">
              {headerLinks.slice(0, 6).map((item) => (
                <Link
                  key={item.id}
                  to={item.url}
                  className="text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          <div
            className={`flex items-center gap-2 shrink-0 ${
              headerCfg.navPosition === 'center' ? 'md:absolute md:right-0' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search articles"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div>

        {/* Inline Search Drawer */}
        {searchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            className="pb-4 flex items-center gap-2 max-w-xl mx-auto"
          >
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search headlines, topics, or reporters..."
              autoFocus
              className="flex-1 px-3.5 py-2 text-sm border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white rounded whitespace-nowrap shrink-0"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Find Stories
            </button>
          </form>
        )}

        {/* 3. Main Navigation Menu Bar (when navPosition === 'below') */}
        {headerCfg.navPosition === 'below' && (
          <nav className="hidden md:flex items-center justify-center gap-7 py-3 border-t border-stone-200 dark:border-stone-800 overflow-x-auto">
            {headerLinks.map((item) => (
              <Link
                key={item.id}
                to={item.url}
                className="text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap shrink-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-3 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2">
            {headerLinks.map((item) => (
              <Link
                key={item.id}
                to={item.url}
                onClick={() => setMobileMenuOpen(false)}
                className="px-2 py-2 text-sm font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex flex-wrap gap-3 px-2">
              {topbarLinks.map((item) => (
                <Link
                  key={item.id}
                  to={item.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-stone-600 dark:text-stone-400"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>

      {/* 4. Breaking News Ticker */}
      {headerCfg.showBreakingTicker && breakingItems.length > 0 && (
        <div
          className="text-white text-xs sm:text-sm py-2 overflow-hidden"
          style={{ backgroundColor: theme.primaryColor || '#9a3412' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-4">
            <span className="font-bold uppercase tracking-wider shrink-0 border-r border-white/30 pr-3">
              Breaking
            </span>
            <div className="overflow-hidden flex-1">
              <div className="animate-ticker gap-10">
                {[...breakingItems, ...breakingItems].map((item, idx) => (
                  <Link
                    key={`${item.id}-${idx}`}
                    to={`/news/${item.slug}`}
                    className="hover:underline whitespace-nowrap mr-10 font-medium"
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
