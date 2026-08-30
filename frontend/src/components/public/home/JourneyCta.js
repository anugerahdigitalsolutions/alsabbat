import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ClubCrestMark } from '../../shared/ClubCrestMark';
import { defaultSiteText } from '../../../lib/siteContent';

/** Full-width closing CTA band before the footer — copy is admin-editable. */
export const JourneyCta = ({ t = defaultSiteText }) => (
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
            <p className="als-eyebrow">{t('home.cta.eyebrow')}</p>
            <h2
              className="font-display mt-3 text-2xl font-extrabold leading-tight sm:text-4xl"
              style={{ color: 'var(--club-light)' }}
            >
              {t('home.cta.title')}
            </h2>
            <p className="mt-3 max-w-xl text-sm sm:text-base" style={{ color: 'rgba(254,254,254,0.82)' }}>
              {t('home.cta.text')}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3 lg:flex-nowrap">
          <Link to="/matches" className="als-btn-gold als-focus" data-testid="home-cta-matches">
            {t('home.cta.btn_matches')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/teams" className="als-btn-ghost als-focus" data-testid="home-cta-squad">
            {t('home.cta.btn_squad')}
          </Link>
          <Link to="/login" className="als-btn-ghost als-focus" data-testid="home-cta-login">
            {t('home.cta.btn_login')}
          </Link>
        </div>
      </div>
    </div>
  </section>
);

export default JourneyCta;
