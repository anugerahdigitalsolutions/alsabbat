import { API_BASE } from './api';

/** SEO foundation helpers — document title, meta description, OG, canonical. */
function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

let pageAppliedPath = null;

export function applySeo({ title, description, image, canonical, siteName, robots }) {
  if (title) document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', robots || 'index,follow');
  upsertMeta('property', 'og:type', 'website');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:image', image);
  upsertMeta('property', 'og:site_name', siteName);
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertLink('canonical', canonical || window.location.href);
}

/** Page-level SEO wins over the club-wide defaults for the current route. */
export function applyPageSeo(options) {
  pageAppliedPath = window.location.pathname;
  applySeo(options);
}

/** Club-wide defaults: never overwrite SEO already set by the current page. */
export function applyDefaultSeo(options) {
  if (pageAppliedPath === window.location.pathname) return;
  applySeo(options);
}

export const SITEMAP_URL = `${API_BASE}/seo/sitemap.xml`;
export const ROBOTS_URL = `${API_BASE}/seo/robots.txt`;
