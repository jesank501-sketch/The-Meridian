import React from 'react';
import { Link } from '../../lib/router';
import { usePortal } from '../../context/PortalContext';
import { SafeImage } from '../common/SafeImage';
import { AdSlot } from '../common/AdSlot';

export function PublicFooter() {
  const { websiteSettings, publishedDesign, categories, pages, navMenus } = usePortal();
  const footerCfg = publishedDesign.footer;
  const footerLinksCol1 = navMenus.filter((m) => m.location === 'footer_col1' && m.isActive);
  const footerLinksCol2 = navMenus.filter((m) => m.location === 'footer_col2' && m.isActive);
  const footerPages = pages.filter((p) => p.status === 'published' && p.showInFooter);

  const socialEntries = Object.entries(websiteSettings.socialLinks || {}).filter(
    ([, url]) => Boolean(url && url.trim())
  );

  return (
    <footer
      className="text-stone-300 border-t border-stone-800 mt-16"
      style={{ backgroundColor: footerCfg.footerBg || '#1c1917' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 empty:hidden">
        <AdSlot placement="footer" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {footerCfg.design === 'minimal_centered' ? (
          <div className="text-center max-w-2xl mx-auto space-y-4">
            {footerCfg.logoUrl ? (
              <SafeImage
                src={footerCfg.logoUrl}
                alt={websiteSettings.siteName}
                className="h-10 mx-auto object-contain"
              />
            ) : (
              <h2 className="font-editorial-heading text-2xl font-bold text-white">
                {websiteSettings.siteName}
              </h2>
            )}
            <p className="text-sm text-stone-400 leading-relaxed">{footerCfg.footerText}</p>
            <div className="flex flex-wrap justify-center gap-5 text-xs pt-2">
              {footerPages.map((p) => (
                <Link key={p.id} to={`/page/${p.slug}`} className="hover:text-white">
                  {p.title}
                </Link>
              ))}
              <Link to="/contact" className="hover:text-white">
                Contact Newsroom
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-stone-800">
            <div className="md:col-span-5 space-y-4">
              {footerCfg.logoUrl ? (
                <SafeImage
                  src={footerCfg.logoUrl}
                  alt={websiteSettings.siteName}
                  className="h-10 object-contain"
                />
              ) : (
                <h2 className="font-editorial-heading text-2xl font-bold text-white">
                  {websiteSettings.siteName}
                </h2>
              )}
              <p className="text-sm text-stone-400 leading-relaxed max-w-md">
                {footerCfg.footerText}
              </p>
              <div className="text-xs text-stone-400 space-y-1">
                {websiteSettings.address && <p>{websiteSettings.address}</p>}
                {websiteSettings.contactEmail && <p>{websiteSettings.contactEmail}</p>}
              </div>
              {footerCfg.showSocialLinks && socialEntries.length > 0 && (
                <div className="flex flex-wrap gap-4 pt-2 text-xs">
                  {socialEntries.map(([name, url]) => (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="capitalize text-stone-300 hover:text-white underline underline-offset-4"
                    >
                      {name}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-3 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Sections
              </h3>
              <ul className="grid grid-cols-2 md:grid-cols-1 gap-2 text-sm">
                {(footerLinksCol1.length > 0
                  ? footerLinksCol1.map((i) => ({ id: i.id, label: i.label, url: i.url }))
                  : categories.slice(0, 6).map((c) => ({
                      id: c.id,
                      label: c.name,
                      url: `/category/${c.slug}`,
                    }))
                ).map((link) => (
                  <li key={link.id}>
                    <Link to={link.url} className="hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                Publication & Policies
              </h3>
              <ul className="space-y-2 text-sm">
                {footerPages.map((pg) => (
                  <li key={pg.id}>
                    <Link to={`/page/${pg.slug}`} className="hover:text-white transition-colors">
                      {pg.title}
                    </Link>
                  </li>
                ))}
                {footerLinksCol2.map((item) => (
                  <li key={item.id}>
                    <Link to={item.url} className="hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    Contact Newsroom
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        )}

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <p>
            © {new Date().getFullYear()} {websiteSettings.siteName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="/sitemap.xml" className="hover:text-stone-300">
              XML Sitemap
            </a>
            <a href="/robots.txt" className="hover:text-stone-300">
              Robots
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
