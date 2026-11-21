import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PortalProvider, usePortal } from './context/PortalContext';
import { RouterProvider, useRouter } from './lib/router';
import { PublicHeader } from './components/public/PublicHeader';
import { PublicHomePage } from './components/public/PublicHomePage';
import { PublicFooter } from './components/public/PublicFooter';
import { ArticleDetailPage } from './components/public/ArticleDetailPage';
import { ArchiveAndSearchPage } from './components/public/ArchiveAndSearchPage';
import { ContactPage, StaticPageView } from './components/public/StaticAndContactPage';
import { AdminLoginPage } from './components/admin/AdminLoginPage';
import { AdminShell } from './components/admin/AdminShell';

function AppRoutes() {
  const { path } = useRouter();
  const { publishedDesign, isOffline } = usePortal();
  const cleanPath = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const isAdminRoute = cleanPath === '/admin' || cleanPath.startsWith('/admin/');

  React.useEffect(() => {
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (isAdminRoute) {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.name = 'robots';
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = 'noindex, nofollow';
    } else if (robotsMeta) {
      robotsMeta.content = 'index, follow';
    }
  }, [isAdminRoute]);

  if (cleanPath === '/admin/login') {
    return <AdminLoginPage />;
  }

  if (isAdminRoute) {
    return <AdminShell />;
  }

  const isDark = publishedDesign.theme.mode === 'dark';

  let pageView: React.ReactNode = <PublicHomePage />;
  if (cleanPath.startsWith('/news/')) {
    const slug = cleanPath.replace(/^\/news\//, '').split('/')[0];
    pageView = <ArticleDetailPage slug={slug} />;
  } else if (cleanPath.startsWith('/category/')) {
    const slug = cleanPath.replace(/^\/category\//, '').split('/')[0];
    pageView = <ArchiveAndSearchPage mode="category" slug={slug} />;
  } else if (cleanPath.startsWith('/tag/')) {
    const slug = cleanPath.replace(/^\/tag\//, '').split('/')[0];
    pageView = <ArchiveAndSearchPage mode="tag" slug={slug} />;
  } else if (cleanPath === '/search') {
    pageView = <ArchiveAndSearchPage mode="search" />;
  } else if (cleanPath.startsWith('/page/')) {
    const slug = cleanPath.replace(/^\/page\//, '').split('/')[0];
    pageView = <StaticPageView slug={slug} />;
  } else if (cleanPath === '/contact') {
    pageView = <ContactPage />;
  }

  return (
    <div
      className="min-h-screen flex flex-col transition-colors"
      style={{
        backgroundColor: isDark ? '#0c0a09' : publishedDesign.theme.backgroundColor || '#ffffff',
        color: isDark ? '#f5f5f4' : publishedDesign.theme.textColor || '#1c1917',
      }}
    >
      {isOffline && (
        <div className="bg-amber-100 text-amber-950 text-xs text-center py-2 px-4 border-b border-amber-300">
          Firestore connection offline. Displaying cached/default editorial edition.
        </div>
      )}
      <PublicHeader />
      <div className="flex-1">{pageView}</div>
      <PublicFooter />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PortalProvider>
        <RouterProvider>
          <AppRoutes />
        </RouterProvider>
      </PortalProvider>
    </ErrorBoundary>
  );
}
