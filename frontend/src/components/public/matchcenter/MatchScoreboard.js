import React from 'react';
import { CalendarDays, Clock, MapPin, Shield } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { STATUS_STYLE, formatMatchDate } from './eventMeta';

const TeamSide = ({ name, logo, align = 'right', testId }) => (
  <div
    className={`flex flex-1 flex-col items-center gap-3 ${align === 'right' ? 'sm:items-end' : 'sm:items-start'}`}
    data-testid={testId}
  >
    {logo ? (
      <img
        src={logo}
        alt={name}
        className="h-14 w-14 rounded-[var(--radius-sm)] object-contain sm:h-16 sm:w-16"
        style={{ backgroundColor: 'rgba(254,254,254,0.06)' }}
        loading="lazy"
      />
    ) : (
      <span
        className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-sm)] sm:h-16 sm:w-16"
        style={{ backgroundColor: 'rgba(254,254,254,0.07)' }}
      >
        <Shield className="h-7 w-7" style={{ color: 'var(--club-primary)' }} />
      </span>
    )}
    <p
      className="font-display max-w-[160px] text-center text-base font-semibold leading-tight sm:max-w-[220px] sm:text-lg"
      style={{ color: 'var(--club-light)' }}
    >
      {name || 'Tim'}
    </p>
  </div>
);

/** Match Center scoreboard header (dark brand surface). */
export const MatchScoreboard = ({ match, clubName, clubLogo, competition, season }) => {
  const status = match?.status || 'SCHEDULED';
  const style = STATUS_STYLE[status] || STATUS_STYLE.SCHEDULED;
  const isHome = match?.venue_type !== 'AWAY';
  const hasScore = match?.home_score !== null && match?.home_score !== undefined;

  const club = { name: clubName, logo: clubLogo };
  const opponent = { name: match?.opponent?.name, logo: match?.opponent?.logo };
  const home = isHome ? club : opponent;
  const away = isHome ? opponent : club;

  return (
    <section
      className="relative overflow-hidden py-10 sm:py-14"
      style={{ backgroundColor: 'var(--club-tertiary)' }}
      data-testid="match-scoreboard"
    >
      <div className="als-stadium-glow absolute inset-0 opacity-80" />
      <div className="als-pitch-lines absolute inset-0" />
      <div className="als-container relative">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge
            variant="outline"
            className="font-semibold"
            style={{ backgroundColor: style.bg, color: style.fg, borderColor: style.border }}
            data-testid="match-status-badge"
          >
            {status}
          </Badge>
          <span
            className="font-display text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--club-primary)' }}
            data-testid="match-competition-label"
          >
            {competition?.name || 'Pertandingan'}
            {season?.name ? ` · ${season.name}` : ''}
          </span>
        </div>

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-4">
          <TeamSide name={home.name} logo={home.logo} align="right" testId="match-home-team" />

          <div className="flex flex-col items-center gap-2">
            <div
              className="font-display rounded-[var(--radius-md)] px-6 py-3 text-3xl font-extrabold tabular-nums sm:text-4xl"
              style={{ backgroundColor: 'rgba(254,254,254,0.08)', color: 'var(--club-light)' }}
              data-testid="match-score"
            >
              {hasScore ? `${match.home_score} - ${match.away_score ?? 0}` : 'VS'}
            </div>
            {match?.time ? (
              <span className="text-xs" style={{ color: 'rgba(254,254,254,0.7)' }} data-testid="match-kickoff-time">
                Kick-off {match.time}
              </span>
            ) : null}
          </div>

          <TeamSide name={away.name} logo={away.logo} align="left" testId="match-away-team" />
        </div>

        <div
          className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs sm:text-sm"
          style={{ color: 'rgba(254,254,254,0.75)' }}
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
