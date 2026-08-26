import { resolveMediaUrl } from '../components/public/gallery/mediaUtils';

/** Maps a CMS banner document to the CinematicHero slide shape (shared: homepage + admin preview). */
export const bannerToSlide = (banner) => {
  const lines = [banner.headline_line_1, banner.headline_line_2, banner.headline_line_3].filter(Boolean);
  const image = resolveMediaUrl(banner.image_resolved || banner.image_url);
  return {
    id: banner.id,
    eyebrow: banner.eyebrow || '',
    headlineLines: lines.length
      ? lines.map((text, index) => ({ text, gold: lines.length > 1 && index === lines.length - 1 }))
      : null,
    headline: lines.length ? null : banner.subheadline || '',
    subheadline: lines.length ? banner.subheadline || null : null,
    meta: banner.meta || null,
    ctaLabel: banner.cta_label || null,
    ctaTo: banner.cta_url || null,
    secondaryLabel: banner.cta_secondary_label || null,
    secondaryTo: banner.cta_secondary_url || null,
    image,
    imagePosition: banner.image_position || 'center',
    alt: banner.image_alt || lines.join(' ') || banner.eyebrow || '',
  };
};

export default bannerToSlide;
