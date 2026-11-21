import React, { createContext, useContext, useEffect, useState } from 'react';

interface RouterContextValue {
  path: string;
  query: URLSearchParams;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [locationState, setLocationState] = useState(() => ({
    path: window.location.pathname || '/',
    search: window.location.search || '',
  }));

  useEffect(() => {
    const onPopState = () => {
      setLocationState({
        path: window.location.pathname || '/',
        search: window.location.search || '',
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (to: string) => {
    if (to.startsWith('http://') || to.startsWith('https://')) {
      window.location.href = to;
      return;
    }
    const url = new URL(to, window.location.origin);
    if (url.pathname === locationState.path && url.search === locationState.search) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', `${url.pathname}${url.search}`);
    setLocationState({ path: url.pathname, search: url.search });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const query = new URLSearchParams(locationState.search);

  return (
    <RouterContext.Provider value={{ path: locationState.path, query, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}

export function Link({
  to,
  children,
  className,
  style,
  onClick,
  ariaLabel,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      className={className}
      style={style}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (to.startsWith('http://') || to.startsWith('https://')) return;
        e.preventDefault();
        onClick?.();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
