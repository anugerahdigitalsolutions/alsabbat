import React from 'react';
import { Link } from 'react-router-dom';
import { Handshake } from 'lucide-react';
import { resolveMediaUrl } from './gallery/mediaUtils';

/** URL profil: slug bila ada, fallback id (tautan lama tetap hidup). */
export const sponsorPath = (sponsor) => `/sponsors/${sponsor?.slug || sponsor?.id}`;

const SponsorTile = ({ sponsor, featured }) => (
  <Link
    to={sponsorPath(sponsor)}
    className={`als-card als-focus flex items-center justify-center transition-shadow hover:shadow-[var(--shadow-md)] ${
      featured ? 'h-32 px-6 sm:h-40 sm:px-8' : 'h-24 px-4'
    }`}
    style={featured ? { borderColor: 'rgba(252,207,43,0.55)' } : undefined}
    aria-label={`Profil sponsor ${sponsor.name}`}
    data-testid={`sponsor-item-${sponsor.id}`}
    data-featured={featured ? 'true' : 'false'}
  >
    {sponsor.logo ? (
      <img
        src={resolveMediaUrl(sponsor.logo)}
        alt={sponsor.name}
        className={`w-auto max-w-full object-contain ${featured ? 'max-h-24 sm:max-h-28' : 'max-h-14'}`}
        loading="lazy"
      />
    ) : (
      <span
        className={`font-display text-center font-semibold ${featured ? 'text-lg' : 'text-sm'}`}
        style={{ color: 'var(--fg)' }}
      >
        {sponsor.name}
      </span>
    )}
  </Link>
);

/**
 * Baris logo sponsor (beranda & halaman lain).
 * Sponsor bertanda `is_featured` (Sponsor Utama) tampil lebih besar di baris atas;
 * sponsor lain tetap ukuran normal. Logo selalu `object-contain` (aspect ratio asli,
 * tidak terpotong) dan klik mengarah ke PROFIL SPONSOR INTERNAL.
 */
export const SponsorsStrip = ({ sponsors = [] }) => {
  if (!sponsors.length) {
    return (
      <div
        className="als-card flex items-center justify-center gap-2 px-6 py-8 text-sm"
        style={{ color: 'var(--muted-fg)' }}
        data-testid="sponsors-empty"
      >
        <Handshake className="h-4 w-4" />
        Belum ada sponsor yang ditampilkan.
      </div>
    );
  }

  const featured = sponsors.filter((s) => s.is_featured);
  const regular = sponsors.filter((s) => !s.is_featured);

  return (
    <div className="space-y-4" data-testid="sponsors-strip">
      {featured.length ? (
        <div
          className={`grid gap-4 ${
            featured.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
          data-testid="sponsors-featured"
        >
          {featured.map((sponsor) => (
            <SponsorTile key={sponsor.id} sponsor={sponsor} featured />
          ))}
        </div>
      ) : null}

      {regular.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" data-testid="sponsors-regular">
          {regular.map((sponsor) => (
            <SponsorTile key={sponsor.id} sponsor={sponsor} featured={false} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default SponsorsStrip;
