import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, MapPin, Shield } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useClub } from '../../context/ClubContext';

const STATUS_STYLE = {
  LIVE: { bg: 'rgba(220,38,38,0.12)', fg: '#991B1B', border: 'rgba(220,38,38,0.22)' },
  FINISHED: { bg: 'rgba(22,163,74,0.12)', fg: '#166534', border: 'rgba(22,163,74,0.22)' },
  SCHEDULED: { bg: 'rgba(2,132,199,0.12)', fg: '#075985', border: 'rgba(2,132,199,0.22)' },
  UPCOMING: { bg: 'rgba(2,132,199,0.12)', fg: '#075985', border: 'rgba(2,132,199,0.22)' },
  POSTPONED: { bg: 'rgba(245,158,11,0.14)', fg: '#92400E', border: 'rgba(245,158,11,0.24)' },
  CANCELLED: { bg: 'rgba(0,0,0,0.08)', fg: '#3F3F46', border: 'rgba(0,0,0,0.18)' },
};

const formatDate = (value) => {
  if (!value) return 'Tanggal belum diatur';
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

const Crest = ({ name, logo }) => (
  <span className="flex items-center justify-center">
    {logo ? (
      <img
        src={logo}
        alt={name || 'Logo tim'}
        className="h-9 w-9 rounded-[8px] object-contain"
        style={{ backgroundColor: 'var(--surface-3)' }}
        loading="lazy"
      />
    ) : (
      <span
        className="flex h-9 w-9 items-center justify-center rounded-[8px]"
        style={{ backgroundColor: 'rgba(1,40,145,0.07)' }}
        aria-hidden="true"
      >
        <Shield className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
      </span>
    )}
  </span>
);

export const MatchCardShell = ({ match, testId }) => {
  const { shortName, club } = useClub();
  const style = STATUS_STYLE[match.status] || STATUS_STYLE.SCHEDULED;
  const isHome = match.venue_type !== 'AWAY';
  const clubSide = { name: shortName, logo: club?.logo };
  const opponentSide = { name: match.opponent?.name, logo: match.opponent?.logo };
  const home = isHome ? clubSide : opponentSide;
  const away = isHome ? opponentSide : clubSide;
  const showScore = match.home_score !== null && match.home_score !== undefined;
  const isLive = match.status === 'LIVE';

  return (
    <Link
      to={`/matches/${match.id}`}
      className="als-card als-lift als-focus group relative block overflow-hidden p-5 sm:p-6"
      data-testid={testId}
      aria-label={`Detail pertandingan melawan ${match.opponent?.name || 'lawan'}`}
    >
      <span
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ backgroundColor: 'var(--club-primary)' }}
        aria-hidden="true"
      />

      <div className="mb-5 flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className="font-semibold"
          style={{ backgroundColor: style.bg, color: style.fg, borderColor: style.border }}
          data-testid={`${testId}-status`}
        >
          {isLive ? (
            <span
              className="als-live-dot mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: '#DC2626' }}
              aria-hidden="true"
            />
          ) : null}
          {match.status}
        </Badge>
        <span
          className="font-display text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--muted-fg)' }}
        >
          {match.venue_type}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center justify-end gap-2.5">
          <span className="font-display text-right text-sm font-semibold leading-tight sm:text-base">
            {home.name}
          </span>
          <Crest name={home.name} logo={home.logo} />
        </div>

        <span
          className="font-display min-w-[86px] rounded-[var(--radius-sm)] px-3 py-2.5 text-center text-xl font-extrabold tabular-nums sm:text-2xl"
          style={{
            backgroundColor: showScore ? 'var(--club-tertiary)' : 'rgba(1,40,145,0.06)',
            color: showScore ? 'var(--club-primary)' : 'var(--club-secondary)',
          }}
          data-testid={`${testId}-score`}
        >
          {showScore ? `${match.home_score}-${match.away_score ?? 0}` : 'VS'}
        </span>

        <div className="flex flex-1 items-center gap-2.5">
          <Crest name={away.name} logo={away.logo} />
          <span className="font-display text-left text-sm font-semibold leading-tight sm:text-base">
            {away.name}
          </span>
        </div>
      </div>

      <div
        className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-xs"
        style={{ color: 'var(--muted-fg)', borderColor: 'var(--border-soft)' }}
      >
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(match.date)}
        </span>
        {match.time ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {match.time}
          </span>
        ) : null}
        {match.venue ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{match.venue}</span>
          </span>
        ) : null}
      </div>

      <span
        className="font-display mt-4 inline-flex min-h-[24px] items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors duration-200 group-hover:text-[var(--club-tertiary)]"
        style={{ color: 'var(--club-secondary)' }}
      >
        Match Center
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
};

export default MatchCardShell;
