import React, { useMemo } from 'react';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { recordAdClick } from '../../lib/firestoreService';
import { sanitizeUrl } from '../../lib/sanitize';
import { useRouter } from '../../lib/router';
import { SafeImage } from './SafeImage';
import type { AdPlacement, AdSize, Advertisement } from '../../types/portal';

function validateHttpsScriptUrl(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

function getDimensionsForSize(adSize?: AdSize): { width: string; height: number } {
  switch (adSize) {
    case '728x90':
      return { width: '728px', height: 90 };
    case '300x250':
      return { width: '300px', height: 250 };
    case '320x50':
      return { width: '320px', height: 50 };
    case '160x600':
      return { width: '160px', height: 600 };
    case '468x60':
      return { width: '468px', height: 60 };
    default:
      return { width: '100%', height: 250 };
  }
}

function SingleAdUnit({
  ad,
  placement,
  primaryColor,
  isPreview = false,
}: {
  ad: Advertisement;
  placement: AdPlacement;
  primaryColor: string;
  isPreview?: boolean;
}) {
  const { navigate } = useRouter();

  const scriptSrcDoc = useMemo(() => {
    const safeSrc = validateHttpsScriptUrl(ad.scriptUrl);
    if (!safeSrc) return '';
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; padding: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; background: transparent; }
    </style>
  </head>
  <body>
    <script async src=${JSON.stringify(safeSrc)}></script>
  </body>
</html>`;
  }, [ad.scriptUrl]);

  if (ad.adType === 'adsense') {
    const validClient = /^ca-pub-\d{10,20}$/.test(ad.adsenseClientId || '');
    const validSlot = /^\d{6,15}$/.test(ad.adsenseSlotId || '');
    if (!validClient || !validSlot) return null;

    return (
      <div
        className="border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 p-4 text-center rounded"
        aria-label="Advertisement"
      >
        <p className="text-[11px] tracking-widest uppercase text-stone-400 mb-2">Advertisement</p>
        <div className="py-4 px-3 border border-dashed border-stone-300 dark:border-stone-700 text-xs text-stone-500 dark:text-stone-400">
          <p className="font-medium text-stone-700 dark:text-stone-300">{ad.title}</p>
          <p className="mt-1 font-mono tabular-nums text-[11px]">
            AdSense Unit · {ad.adsenseClientId} / {ad.adsenseSlotId}
          </p>
        </div>
      </div>
    );
  }

  if (ad.adType === 'ad_script') {
    const safeSrc = validateHttpsScriptUrl(ad.scriptUrl);
    if (!safeSrc) return null;
    const dims = getDimensionsForSize(ad.adSize);
    const networkLabel =
      ad.network === 'adsterra'
        ? 'Adsterra'
        : ad.network === 'monetag'
        ? 'Monetag'
        : 'Sponsored';

    return (
      <div
        className="border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-3 rounded flex flex-col items-center"
        aria-label="Advertisement"
      >
        <div className="w-full flex items-center justify-between text-[11px] uppercase tracking-wider text-stone-400 mb-2">
          <span>Advertisement · {networkLabel}</span>
          <span className="truncate ml-2">{ad.title}</span>
        </div>
        <div className="w-full overflow-x-auto flex justify-center">
          <iframe
            title={ad.title}
            srcDoc={scriptSrcDoc}
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
            style={{
              width: dims.width,
              maxWidth: '100%',
              height: `${dims.height}px`,
              border: 'none',
            }}
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  if (ad.adType === 'adsterra_direct' || ad.adType === 'monetag_direct') {
    const target = sanitizeUrl(ad.targetUrl);
    if (!target) return null;

    const networkLabel = ad.adType === 'adsterra_direct' ? 'Adsterra Partner' : 'Monetag Partner';
    const cta = ad.ctaText?.trim() || 'Visit Sponsor';

    const handleDirectClick = () => {
      if (!isPreview && ad.id) {
        recordAdClick(ad.id);
      }
    };

    return (
      <div
        className="border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/70 p-4 rounded flex flex-col justify-between gap-3"
        aria-label="Sponsored Direct Link"
      >
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-stone-400">
          <span>Sponsored</span>
          <span>{networkLabel}</span>
        </div>

        {ad.imageUrl && (
          <a
            href={target}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleDirectClick}
            className="block overflow-hidden rounded"
          >
            <SafeImage
              src={ad.imageUrl}
              alt={ad.title}
              fallbackTitle={ad.title}
              className={`w-full object-cover hover:scale-[1.01] transition-transform duration-300 ${
                placement === 'sidebar'
                  ? 'h-44'
                  : placement === 'header'
                  ? 'h-20'
                  : 'h-32 sm:h-36'
              }`}
            />
          </a>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <a
              href={target}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={handleDirectClick}
              className="font-editorial-heading text-base font-bold text-stone-900 dark:text-stone-100 hover:underline block"
            >
              {ad.title}
            </a>
            {ad.description && (
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                {ad.description}
              </p>
            )}
          </div>

          <a
            href={target}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={handleDirectClick}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded shrink-0 transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ backgroundColor: primaryColor || '#9a3412' }}
          >
            <span>{cta}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  // Standard Custom Image Banner
  const target = sanitizeUrl(ad.targetUrl);

  const handleClick = (e: React.MouseEvent) => {
    if (!isPreview && ad.id) {
      recordAdClick(ad.id);
    }
    if (target.startsWith('/')) {
      e.preventDefault();
      navigate(target);
    }
  };

  return (
    <div className="border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 p-3 rounded">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-stone-400 mb-2">
        <span>Advertisement</span>
        <span className="truncate ml-2">{ad.title}</span>
      </div>
      {target ? (
        <a
          href={target}
          target={target.startsWith('http') ? '_blank' : undefined}
          rel={target.startsWith('http') ? 'noopener noreferrer sponsored' : undefined}
          onClick={handleClick}
          className="block group relative overflow-hidden rounded"
        >
          <SafeImage
            src={ad.imageUrl}
            alt={ad.title}
            fallbackTitle={ad.title}
            className={`w-full object-cover transition-transform duration-300 group-hover:scale-[1.01] ${
              placement === 'sidebar' ? 'h-56' : placement === 'header' ? 'h-20' : 'h-28 md:h-36'
            }`}
          />
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-stone-900/80 text-white text-[11px] px-2 py-0.5 rounded">
            {ad.ctaText?.trim() || 'Learn more'} <ExternalLink className="w-3 h-3" />
          </span>
        </a>
      ) : (
        <SafeImage
          src={ad.imageUrl}
          alt={ad.title}
          fallbackTitle={ad.title}
          className={`w-full object-cover rounded ${
            placement === 'sidebar' ? 'h-56' : placement === 'header' ? 'h-20' : 'h-28 md:h-36'
          }`}
        />
      )}
    </div>
  );
}

export function AdSlot({
  placement,
  className = '',
  showAll = false,
  previewAd,
}: {
  placement: AdPlacement;
  className?: string;
  showAll?: boolean;
  previewAd?: Advertisement;
}) {
  const { advertisements, publishedDesign } = usePortal();
  const primaryColor = publishedDesign.theme.primaryColor;

  if (previewAd) {
    return (
      <div className={className}>
        <SingleAdUnit ad={previewAd} placement={placement} primaryColor={primaryColor} isPreview />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const matchingAds = advertisements.filter((ad) => {
    if (!ad.isActive || ad.placement !== placement) return false;
    if (ad.startDate && ad.startDate > today) return false;
    if (ad.endDate && ad.endDate < today) return false;
    return true;
  });

  if (matchingAds.length === 0) return null;

  const adsToRender = showAll || placement === 'sponsored_section' ? matchingAds : [matchingAds[0]];

  if (placement === 'sponsored_section') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
        {adsToRender.map((ad) => (
          <SingleAdUnit
            key={ad.id}
            ad={ad}
            placement={placement}
            primaryColor={primaryColor}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {adsToRender.map((ad) => (
        <SingleAdUnit
          key={ad.id}
          ad={ad}
          placement={placement}
          primaryColor={primaryColor}
        />
      ))}
    </div>
  );
}
