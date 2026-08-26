import { useEffect } from 'react';
import { applyPageSeo } from '../lib/seo';
import { useClub } from '../context/ClubContext';

/** Per-page SEO: title, meta description, Open Graph, canonical URL. */
export function usePageSeo({ title, description, image, path, robots }) {
  const { seo, clubName, shortName, club } = useClub();

  useEffect(() => {
    const siteName = shortName || 'ALSABBAT';
    const base = seo?.site_url || window.location.origin;
    applyPageSeo({
      title: title ? `${title} | ${clubName}` : seo?.title || clubName,
      description: description || seo?.description,
      image: image || seo?.open_graph?.image || club?.logo,
      canonical: `${base}${path || window.location.pathname}`,
      siteName,
      robots: robots || 'index,follow',
    });
  }, [title, description, image, path, robots, seo, clubName, shortName, club]);
}

export default usePageSeo;
