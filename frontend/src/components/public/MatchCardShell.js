import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, MapPin, Shield } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useClub } from '../../context/ClubContext';
import { kickoffAt } from './MatchdayCountdown';
import { useCountdown } from '../../hooks/useCountdown';
import { resolveMediaUrl } from './gallery/mediaUtils';

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
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

/** Fixed square box so both crests look balanced even with different source sizes. */
const Crest = ({ name, logo }) => (
  <span
    className="flex h-16 w-16 items-center justify-center rounded-[14px] sm:h-[72px] sm:w-[72px]"
    style={{ backgroundColor: 'rgba(1,40,145,0.04)' }}
  >
    {logo ? (
      <img
        src={resolveMediaUrl(logo)}
        alt={name || 'Logo tim'}
        className="h-[52px] w-[52px] object-contain sm:h-[60px] sm:w-[60px]"
        loading="lazy"
      />
    ) : (
      <Shield className="h-6 w-6" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
    )}
  </span>
);

const Side = ({ side, align }) => (
  <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
    <Crest name={side.name} logo={side.logo} />
    <span
      className={`font-display line-clamp-2 w-full text-center text-[13px] font-bold leading-tight sm:text-sm ${align}`}
      style={{ color: 'var(--fg)' }}
    >
      {side.name || 'Tim'}
    </span>
  </div>
);

const CountdownRow = ({ kickoff, testId }) => {
  const { running, days, hours, minutes, seconds } = useCountdown(kickoff);
  if (!running) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div
      className="mt-4 flex items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 py-2"
      style={{ backgroundColor: 'rgba(1,40,145,0.05)' }}
      data-testid={`${testId}-countdown`}
    >
      {[
        { v: pad(days), l: 'HARI' },
        { v: pad(hours), l: 'JAM' },
        { v: pad(minutes), l: 'MNT' },
        { v: pad(seconds), l: 'DTK' },
      ].map((unit) => (
        <span key={unit.l} className="flex flex-col items-center">
          <span className="font-display text-sm font-extrabold tabular-nums" style={{ color: 'var(--club-secondary)' }}>
            {unit.v}
          </span>
          <span
            className="font-display text-[8px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: 'var(--muted-fg)' }}
          >
            {unit.l}
          </span>
        </span>
      ))}
    </div>
  );
};

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
  const cover = resolveMediaUrl(match.match_cover);
  const kickoff = kickoffAt(match);
  const competition = match.competition?.name || match.competition_name || 'Pertandingan';

  return (
    <Link
      to={`/matches/${match.id}`}
      className="als-card als-lift als-focus group relative block overflow-hidden"
      data-testid={testId}
      aria-label={`Detail pertandingan melawan ${match.opponent?.name || 'lawan'}`}
    >
      {cover ? (
        <span className="relative block h-36 w-full overflow-hidden sm:h-44" data-testid={`${testId}-cover`}>
          <img
            src={cover}
            alt={`Pertandingan ${home.name} vs ${away.name}`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <span
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(1,40,145,0.42), rgba(1,40,145,0.06) 60%, transparent)' }}
            aria-hidden="true"
          />
        </span>
      ) : null}

      {/* pattern gradasi dekoratif */}
      <span
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(560px circle at 12% 0%, rgba(1,40,145,0.07), transparent 62%), radial-gradient(360px circle at 96% 12%, rgba(252,207,43,0.14), transparent 66%)',
        }}
      />
      <span
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ backgroundColor: 'var(--club-primary)' }}
        aria-hidden="true"
      />

      <div className="relative p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <span
            className="font-display truncate text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: 'var(--club-secondary)' }}
            data-testid={`${testId}-competition`}
          >
            {competition}
          </span>
          <Badge
            variant="outline"
            className="shrink-0 font-semibold"
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
        </div>

        <div className="flex items-start justify-center gap-3 sm:gap-5">
          <Side side={home} align="" />
          <span
            className="font-display mt-5 min-w-[74px] rounded-[var(--radius-sm)] px-3 py-2 text-center text-lg font-extrabold tabular-nums sm:text-xl"
            style={{
              backgroundColor: showScore ? 'var(--club-tertiary)' : 'rgba(1,40,145,0.06)',
              color: showScore ? 'var(--club-primary)' : 'var(--club-secondary)',
            }}
            data-testid={`${testId}-score`}
          >
            {showScore ? `${match.home_score}-${match.away_score ?? 0}` : 'VS'}
          </span>
          <Side side={away} align="" />
        </div>

        {kickoff ? <CountdownRow kickoff={kickoff} testId={testId} /> : null}

        <div
          className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t pt-4 text-xs"
          style={{ color: 'var(--muted-fg)', borderColor: 'var(--border-soft)' }}
        >
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(match.date)}
          </span>
          {match.time ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {match.time.slice(0, 5)} WIB
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
          Pusat Pertandingan
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
};

export default MatchCardShell;
