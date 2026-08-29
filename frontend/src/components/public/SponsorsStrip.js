import React from 'react';
import { Link } from 'react-router-dom';
import { Handshake } from 'lucide-react';
import { resolveMediaUrl } from './gallery/mediaUtils';

/**
 * Baris logo sponsor (beranda & halaman lain).
 * Logo selalu `object-contain` (aspect ratio asli, tidak terpotong) dan klik
 * mengarah ke PROFIL SPONSOR INTERNAL — bukan website eksternal.
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

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" data-testid="sponsors-strip">
      {sponsors.map((sponsor) => (
        <Link
          key={sponsor.id}
          to={`/sponsors/${sponsor.id}`}
          className="als-card als-focus flex h-24 items-center justify-center px-4 transition-shadow hover:shadow-[var(--shadow-md)]"
          aria-label={`Profil sponsor ${sponsor.name}`}
          data-testid={`sponsor-item-${sponsor.id}`}
        >
          {sponsor.logo ? (
            <img
              src={resolveMediaUrl(sponsor.logo)}
              alt={sponsor.name}
              className="max-h-14 w-auto max-w-full object-contain"
              loading="lazy"
            />
          ) : (
            <span className="font-display text-center text-sm font-semibold" style={{ color: 'var(--fg)' }}>
              {sponsor.name}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
};

export default SponsorsStrip;
