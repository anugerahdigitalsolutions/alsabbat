import React from 'react';
import { resolveMediaUrl } from '../gallery/mediaUtils';
import { CalendarDays, Clock, MapPin, Shield } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { STATUS_STYLE, formatMatchDate } from './eventMeta';
import { useScrollReveal } from '../../../hooks/useScrollReveal';

const TeamSide = ({ name, logo, align = 'right', isClub, sideLabel, testId }) => (
  <div
    className={`flex flex-1 flex-col items-center gap-3 ${align === 'right' ? 'sm:items-end' : 'sm:items-start'}`}
    data-testid={testId}
  >
    {logo ? (
      <img
        src={resolveMediaUrl(logo)}
        alt={name}
        className="h-16 w-16 rounded-[var(--radius-sm)] object-contain sm:h-20 sm:w-20"
        style={{ backgroundColor: 'rgba(254,254,254,0.06)' }}
        loading="eager"
      />
    ) : (
      <span
        className="flex h-16 w-16 items-center justify-center rounded-[var(--radius-sm)] sm:h-20 sm:w-20"
        style={{
          backgroundColor: 'rgba(254,254,254,0.07)',
          border: isClub ? '1px solid rgba(252,207,43,0.45)' : '1px solid rgba(254,254,254,0.12)',
        }}
        aria-hidden="true"
      >
        <Shield className="h-8 w-8" style={{ color: isClub ? 'var(--club-primary)' : 'rgba(254,254,254,0.55)' }} />
      </span>
    )}
    <div className={align === 'right' ? 'sm:text-right' : 'sm:text-left'}>
      <p
        className="font-display max-w-[170px] text-center text-base font-bold leading-tight sm:max-w-[230px] sm:text-xl"
        style={{ color: 'var(--club-light)' }}
      >
        {name || 'Tim'}
      </p>
      <p
        className="font-display mt-1 text-center text-[10px] font-semibold uppercase tracking-[0.2em] sm:text-left"
        style={{ color: isClub ? 'var(--club-primary)' : 'rgba(254,254,254,0.5)' }}
      >
        {isClub ? sideLabel : `${sideLabel} · Lawan`}
      </p>
    </div>
  </div>
);

/** Match Center scoreboard hero (dark brand surface, optional real match media). */
export const MatchScoreboard = ({ match, clubName, clubLogo, competition, season, heroImage }) => {
  const [ref, shown] = useScrollReveal({ threshold: 0.01 });
  const status = match?.status || 'SCHEDULED';
  const style = STATUS_STYLE[status] || STATUS_STYLE.SCHEDULED;
  const isHome = match?.venue_type !== 'AWAY';
  const hasScore = match?.home_score !== null && match?.home_score !== undefined;

  const club = { name: clubName, logo: clubLogo, isClub: true };
  const opponent = { name: match?.opponent?.name, logo: match?.opponent?.logo, isClub: false };
  const home = isHome ? club : opponent;
  const away = isHome ? opponent : club;
  const step = (index) => ({ animationDelay: shown ? `${70 * index}ms` : undefined });
  const revealClass = shown ? 'als-reveal-shown' : 'als-reveal-hidden';

  return (
    <section
      ref={ref}
      className="relative overflow-hidden py-12 sm:py-16"
      style={{ backgroundColor: 'var(--club-tertiary)' }}
      data-testid="match-scoreboard"
    >
      {heroImage ? (
        <img
          src={heroImage}
          alt={`Media pertandingan melawan ${match?.opponent?.name || 'lawan'}`}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.4 }}
          loading="eager"
          data-testid="match-hero-media"
        />
      ) : null}
      <div className="als-stadium-glow absolute inset-0 opacity-80" aria-hidden="true" />
      <div className="als-pitch-lines absolute inset-0" aria-hidden="true" />
      {heroImage ? <div className="als-scrim absolute inset-0" aria-hidden="true" /> : null}

      <div className="als-container relative">
        <div className={`mb-2 ${revealClass}`} style={step(0)}>
          <p
            className="font-display text-[22px] font-semibold uppercase leading-none tracking-[0.28em]"
            style={{ color: 'var(--club-primary)' }}
            data-testid="match-scoreboard-matchday"
          >
            Match Day
          </p>
        </div>

        <div className={`mb-8 flex flex-wrap items-center gap-3 ${revealClass}`} style={step(1)}>
          <Badge
            variant="outline"
            className="font-semibold"
            style={{ backgroundColor: style.bg, color: style.fg, borderColor: style.border }}
            data-testid="match-status-badge"
          >
            {status === 'LIVE' ? (
              <span
                className="als-live-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: '#DC2626' }}
                aria-hidden="true"
              />
            ) : null}
            {status}
          </Badge>
          <span
            className="font-display text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'rgba(254,254,254,0.8)' }}
            data-testid="match-competition-label"
          >
            {competition?.name || 'Pertandingan'}
            {season?.name ? ` · ${season.name}` : ''}
          </span>
        </div>

        <div className={`flex flex-col items-center gap-8 sm:flex-row sm:gap-6 ${revealClass}`} style={step(2)}>
          <TeamSide name={home.name} logo={home.logo} isClub={home.isClub} sideLabel="Tuan Rumah" align="right" testId="match-home-team" />

          <div className="flex flex-col items-center gap-3">
            <div
              className="font-display rounded-[var(--radius-md)] px-7 py-4 text-4xl font-extrabold tabular-nums sm:text-6xl"
              style={{
                backgroundColor: 'rgba(254,254,254,0.06)',
                border: '1px solid rgba(252,207,43,0.28)',
                color: hasScore ? 'var(--club-primary)' : 'var(--club-light)',
                letterSpacing: '-0.02em',
              }}
              data-testid="match-score"
            >
              {hasScore ? `${match.home_score} — ${match.away_score ?? 0}` : 'VS'}
            </div>
            <span className="als-gold-rule" aria-hidden="true" />
            {match?.time ? (
              <span
                className="font-display text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: 'rgba(254,254,254,0.7)' }}
                data-testid="match-kickoff-time"
              >
                Mulai {match.time}
              </span>
            ) : null}
          </div>

          <TeamSide name={away.name} logo={away.logo} isClub={away.isClub} sideLabel="Tandang" align="left" testId="match-away-team" />
        </div>

        <div
          className={`mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs sm:text-sm ${revealClass}`}
          style={{ color: 'rgba(254,254,254,0.75)', ...step(3) }}
        >
          <span className="inline-flex items-center gap-1.5" data-testid="match-date">
            <CalendarDays className="h-4 w-4" />
            {formatMatchDate(match?.date)}
          </span>
          {match?.time ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {match.time} WIB
            </span>
          ) : null}
          {match?.venue ? (
            <span className="inline-flex items-center gap-1.5" data-testid="match-venue">
              <MapPin className="h-4 w-4" />
              {match.venue}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default MatchScoreboard;
