import React from 'react';
import { Award, Flag, Flame, HeartHandshake, Shield, Star, Target, Users } from 'lucide-react';
import { defaultSiteText } from '../../../lib/siteContent';

const PILLARS = [
  {
    id: 'club',
    FallbackIcon: Shield,
    accent: 'linear-gradient(90deg, #FCCF2B 0%, #FFE07A 100%)',
    underline: '#FCCF2B',
  },
  {
    id: 'team',
    FallbackIcon: Users,
    accent: 'linear-gradient(90deg, #012891 0%, #FCCF2B 100%)',
    underline: '#012891',
  },
  {
    id: 'dream',
    FallbackIcon: Star,
    accent: 'linear-gradient(90deg, #FCCF2B 0%, #012891 100%)',
    underline: '#FCCF2B',
  },
  {
    id: 'glory',
    FallbackIcon: Award,
    accent: 'linear-gradient(90deg, #012891 0%, #1E4FD8 100%)',
    underline: '#012891',
  },
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
 * Ilustrasi bola & garis lapangan, sangat halus di sudut bawah kartu.
 * Murni dekoratif (opacity rendah) supaya tidak mengganggu keterbacaan teks.
 */
const PitchGlyph = () => (
  <svg
    className="pointer-events-none absolute -bottom-7 -right-6 h-32 w-32 transition-transform duration-700 group-hover:scale-110 sm:h-36 sm:w-36"
    viewBox="0 0 100 100"
    fill="none"
    stroke="#012891"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ opacity: 0.07 }}
  >
    <circle cx="50" cy="50" r="33" />
    <path d="M50 25 L63.5 34.8 L58.3 50.8 L41.7 50.8 L36.5 34.8 Z" />
    <path d="M50 17 L50 25 M63.5 34.8 L77 30.4 M58.3 50.8 L68.3 63.5 M41.7 50.8 L31.7 63.5 M36.5 34.8 L23 30.4" />
    <path d="M2 90 A48 48 0 0 1 50 86" strokeWidth="1.2" />
  </svg>
);

/**
 * Pilar brand AL SABBAT — statement editorial premium.
 * Ikon, judul dan teks tetap diedit dari Admin → Konten Halaman → Teks Halaman.
 */
export const PillarStrip = ({ t = defaultSiteText }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5" data-testid="home-pillars">
    {PILLARS.map(({ id, FallbackIcon, accent, underline }, index) => {
      const iconKey = String(t(`home.pillar.${id}.icon`) || '').trim().toLowerCase();
      const Icon = ICONS[iconKey] || FallbackIcon;
      return (
        <article
          key={id}
          className="als-lift group relative flex h-full flex-col overflow-hidden p-6 pt-7 sm:p-7 sm:pt-8"
          style={{
            background: 'linear-gradient(158deg, #FEFEFE 0%, #FEFEFE 55%, rgba(1,40,145,0.05) 100%)',
            border: '1px solid rgba(1,40,145,0.12)',
            borderRadius: 14,
            boxShadow: '0 1px 2px rgba(1,40,145,0.05), 0 20px 38px -28px rgba(1,40,145,0.48)',
            animation: `als-reveal-in 620ms var(--ease-out) ${index * 90}ms both`,
          }}
          data-testid={`home-pillar-${id}`}
        >
          {/* Accent line atas — pembeda tiap kartu, tetap satu keluarga warna klub. */}
          <span
            className="absolute left-0 right-0 top-0 h-[3px]"
            style={{ background: accent }}
            aria-hidden="true"
          />

          <PitchGlyph />

          {/* Medali ikon — ikon lama tetap, tampil jauh lebih menonjol. */}
          <div
            className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:scale-105"
            style={{
              background: 'linear-gradient(145deg, #012891 0%, #01205F 100%)',
              borderRadius: 14,
              boxShadow: '0 12px 22px -14px rgba(1,40,145,0.85)',
            }}
          >
            <Icon
              className="h-6 w-6"
              strokeWidth={1.75}
              style={{ color: 'var(--club-primary)' }}
              aria-hidden="true"
            />
          </div>

          <h3
            className="font-display relative mt-6 text-lg font-extrabold uppercase leading-[1.15] tracking-[0.045em] sm:text-xl lg:text-[22px]"
            style={{ color: 'var(--club-secondary)' }}
            data-testid={`home-pillar-${id}-title`}
          >
            {t(`home.pillar.${id}.title`)}
          </h3>

          <span
            className="relative mt-3.5 block h-[3px] w-12 rounded-full transition-all duration-500 group-hover:w-16"
            style={{ backgroundColor: underline }}
            aria-hidden="true"
          />

          <p
            className="relative mt-4 text-[13.5px] leading-relaxed"
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
