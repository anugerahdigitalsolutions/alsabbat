import React from 'react';
import { Award, Flag, Flame, HeartHandshake, Shield, Star, Target, Users } from 'lucide-react';
import { defaultSiteText } from '../../../lib/siteContent';

const PILLARS = [
  { id: 'club', fallbackNumber: '01', FallbackIcon: Shield },
  { id: 'team', fallbackNumber: '02', FallbackIcon: Users },
  { id: 'dream', fallbackNumber: '03', FallbackIcon: Star },
  { id: 'glory', fallbackNumber: '04', FallbackIcon: Award },
];

/** Ikon yang bisa dipilih admin lewat CMS (`home.pillar.<id>.icon`). */
const ICONS = {
  shield: Shield,
  users: Users,
  handshake: HeartHandshake,
  award: Award,
  star: Star,
  target: Target,
  flag: Flag,
  flame: Flame,
};

/**
 * Pilar brand AL SABBAT — statement editorial premium.
 * Seluruh isi (nomor, ikon, judul, teks) diedit dari Admin → Konten Halaman → Teks Halaman.
 */
export const PillarStrip = ({ t = defaultSiteText }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5" data-testid="home-pillars">
    {PILLARS.map(({ id, fallbackNumber, FallbackIcon }, index) => {
      const iconKey = String(t(`home.pillar.${id}.icon`) || '').trim().toLowerCase();
      const Icon = ICONS[iconKey] || FallbackIcon;
      const number = String(t(`home.pillar.${id}.number`) || '').trim() || fallbackNumber;
      return (
        <article
          key={id}
          className="als-lift group flex h-full flex-col p-6 sm:p-7"
          style={{
            backgroundColor: 'var(--club-light, #FEFEFE)',
            border: '1px solid rgba(1,40,145,0.10)',
            borderRadius: 'var(--radius-sm, 10px)',
            boxShadow: '0 1px 2px rgba(1,40,145,0.04), 0 10px 24px -20px rgba(0,0,0,0.30)',
            animation: `als-reveal-in 620ms var(--ease-out) ${index * 90}ms both`,
          }}
          data-testid={`home-pillar-${id}`}
        >
          <div className="flex items-center justify-between gap-4">
            <span
              className="font-display text-[11px] font-bold tracking-[0.32em] tabular-nums"
              style={{ color: 'rgba(1,40,145,0.35)' }}
              data-testid={`home-pillar-${id}-number`}
            >
              {number}
            </span>
            <Icon
              className="h-5 w-5 transition-transform duration-500 group-hover:scale-110"
              strokeWidth={1.5}
              style={{ color: 'var(--club-secondary)' }}
              aria-hidden="true"
            />
          </div>

          <h3
            className="font-display mt-7 text-[15px] font-extrabold uppercase leading-tight tracking-[0.06em] sm:text-base"
            style={{ color: 'var(--club-secondary)' }}
            data-testid={`home-pillar-${id}-title`}
          >
            {t(`home.pillar.${id}.title`)}
          </h3>

          <span
            className="mt-4 block h-px w-10"
            style={{ backgroundColor: 'var(--club-primary)' }}
            aria-hidden="true"
          />

          <p
            className="mt-4 text-[13px] leading-relaxed"
            style={{ color: 'var(--muted-fg)' }}
            data-testid={`home-pillar-${id}-text`}
          >
            {t(`home.pillar.${id}.text`)}
          </p>
        </article>
      );
    })}
  </div>
);

export default PillarStrip;
