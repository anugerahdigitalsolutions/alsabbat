import React from 'react';
import { Handshake } from 'lucide-react';

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
        <a
          key={sponsor.id}
          href={sponsor.website || '#'}
          target={sponsor.website ? '_blank' : undefined}
          rel="noreferrer"
          className="als-card flex h-24 items-center justify-center px-4 transition-shadow hover:shadow-[var(--shadow-md)]"
          data-testid={`sponsor-item-${sponsor.id}`}
        >
          {sponsor.logo ? (
            <img src={sponsor.logo} alt={sponsor.name} className="max-h-12 max-w-full object-contain" loading="lazy" />
          ) : (
            <span className="font-display text-center text-sm font-semibold" style={{ color: 'var(--fg)' }}>
              {sponsor.name}
            </span>
          )}
        </a>
      ))}
    </div>
  );
};

export default SponsorsStrip;
