import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ClubCrestMark } from '../../shared/ClubCrestMark';

/** Full-width closing CTA band before the footer. */
export const JourneyCta = ({ clubName = 'ALSABBAT' }) => (
  <section className="pb-4" data-testid="home-cta">
    <div
      className="relative overflow-hidden rounded-[var(--radius-xl)] p-8 sm:p-12"
      style={{ backgroundColor: 'var(--club-secondary)' }}
    >
      <span className="als-pitch-lines absolute inset-0 opacity-70" aria-hidden="true" />
      <span
        className="absolute inset-0"
        style={{ background: 'radial-gradient(680px circle at 88% 10%, rgba(252,207,43,0.30), transparent 60%)' }}
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-start gap-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-5">
          <span className="hidden sm:block">
            <ClubCrestMark size={56} onDark testId="home-cta-crest" />
          </span>
          <div>
            <p className="als-eyebrow">Ikuti Perjalanan Kami</p>
            <h2
              className="font-display mt-3 text-2xl font-extrabold leading-tight sm:text-4xl"
              style={{ color: 'var(--club-light)' }}
            >
              Jadi bagian dari Baraya {clubName}
            </h2>
            <p className="mt-3 max-w-xl text-sm sm:text-base" style={{ color: 'rgba(254,254,254,0.82)' }}>
              Ikuti setiap matchday, cerita skuad, dan momen di lapangan bersama kami.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3 lg:flex-nowrap">
          <Link to="/matches" className="als-btn-gold als-focus" data-testid="home-cta-matches">
            Jadwal Pertandingan <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/teams" className="als-btn-ghost als-focus" data-testid="home-cta-squad">
            Lihat Skuad
          </Link>
          <Link to="/gallery" className="als-btn-ghost als-focus" data-testid="home-cta-gallery">
            Galeri
          </Link>
        </div>
      </div>
    </div>
  </section>
);

export default JourneyCta;
