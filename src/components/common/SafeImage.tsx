import React, { useState } from 'react';
import { Newspaper } from 'lucide-react';
import { sanitizeUrl } from '../../lib/sanitize';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackTitle?: string;
}

export function SafeImage({ src, alt, className = '', style, fallbackTitle }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const cleanSrc = sanitizeUrl(src);

  if (!cleanSrc || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-900 text-stone-500 dark:text-stone-400 p-4 text-center ${className}`}
        style={style}
        role="img"
        aria-label={alt}
      >
        <Newspaper className="w-7 h-7 mb-1.5 opacity-60" />
        {fallbackTitle && (
          <span className="text-xs font-medium line-clamp-2 max-w-[180px] opacity-75">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      style={style}
    />
  );
}
