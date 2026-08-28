import { useEffect } from 'react';
import api from './api';
import { resolveMediaUrl } from '../components/public/gallery/mediaUtils';

export const SITE_FAVICON_KEY = 'site.favicon';
export const DEFAULT_FAVICON = '/favicon.svg';

/** Declared icon sizes; browsers downscale from the single square source. */
const ICON_LINKS = [
  { rel: 'icon', sizes: '16x16' },
  { rel: 'icon', sizes: '32x32' },
  { rel: 'icon', sizes: '48x48' },
  { rel: 'icon', sizes: '192x192' },
  { rel: 'icon', sizes: '512x512' },
  { rel: 'shortcut icon', sizes: null },
  { rel: 'apple-touch-icon', sizes: '180x180' },
];

export const parseFaviconConfig = (raw) => {
  if (!raw) return { url: '', version: '' };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { url: parsed.url || '', version: parsed.version || '' };
  } catch {
    return { url: '', version: '' };
  }
};

export const faviconHref = (config) => {
  const cfg = parseFaviconConfig(config);
  if (!cfg.url) return DEFAULT_FAVICON;
  const url = resolveMediaUrl(cfg.url);
  return cfg.version ? `${url}${url.includes('?') ? '&' : '?'}v=${cfg.version}` : url;
};

const mimeFor = (href) => {
  const clean = href.split('?')[0].toLowerCase();
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.ico')) return 'image/x-icon';
  if (clean.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

/** Replaces the document icon links with the configured favicon. */
export const applyFavicon = (config) => {
  const href = faviconHref(config);
  const type = mimeFor(href);
  document
    .querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
    .forEach((node) => node.parentNode.removeChild(node));
  ICON_LINKS.forEach(({ rel, sizes }) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    link.type = type;
    if (sizes) link.sizes = sizes;
    link.dataset.siteIcon = 'true';
    document.head.appendChild(link);
  });
};

/** Mounted once at app root: reads the published favicon config and applies it. */
export function SiteIcons() {
  useEffect(() => {
    let cancelled = false;
    api
      .get('/site-content/public')
      .then(({ data }) => {
        if (cancelled) return;
        const raw = data?.items?.[SITE_FAVICON_KEY];
        if (raw) applyFavicon(raw);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

export default SiteIcons;
