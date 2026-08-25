import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Clock, MapPin } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useClub } from '../../context/ClubContext';

const STATUS_STYLE = {
  LIVE: { bg: 'rgba(220,38,38,0.12)', fg: '#991B1B', border: 'rgba(220,38,38,0.22)' },
  FINISHED: { bg: 'rgba(22,163,74,0.12)', fg: '#166534', border: 'rgba(22,163,74,0.22)' },
  SCHEDULED: { bg: 'rgba(2,132,199,0.12)', fg: '#075985', border: 'rgba(2,132,199,0.22)' },
  UPCOMING: { bg: 'rgba(2,132,199,0.12)', fg: '#075985', border: 'rgba(2,132,199,0.22)' },
  POSTPONED: { bg: 'rgba(245,158,11,0.14)', fg: '#92400E', border: 'rgba(245,158,11,0.24)' },
  CANCELLED: { bg: 'rgba(34,34,34,0.08)', fg: '#3F3F46', border: 'rgba(34,34,34,0.18)' },
};

const formatDate = (value) => {
  if (!value) return 'Tanggal belum diatur';
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

export const MatchCardShell = ({ match, testId }) => {
  const { shortName } = useClub();
  const style = STATUS_STYLE[match.status] || STATUS_STYLE.SCHEDULED;
  const isHome = match.venue_type !== 'AWAY';
  const home = isHome ? shortName : match.opponent?.name;
  const away = isHome ? match.opponent?.name : shortName;
  const showScore = match.home_score !== null && match.home_score !== undefined;

  return (
    <Link
      to={`/matches/${match.id}`}
      className="als-card block p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ '--tw-ring-color': 'var(--focus-ring)' }}
      data-testid={testId}
      aria-label={`Detail pertandingan melawan ${match.opponent?.name || 'lawan'}`}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className="font-semibold"
          style={{ backgroundColor: style.bg, color: style.fg, borderColor: style.border }}
          data-testid={`${testId}-status`}
        >
          {match.status}
        </Badge>
        <span
          className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--muted-fg)' }}
        >
          {match.venue_type}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="font-display flex-1 text-right text-sm font-semibold sm:text-base">{home}</span>
        <span
          className="font-display min-w-[74px] rounded-[var(--radius-sm)] px-3 py-2 text-center text-lg font-bold tabular-nums"
          style={{ backgroundColor: 'rgba(1,40,145,0.06)', color: 'var(--club-secondary)' }}
        >
          {showScore ? `${match.home_score} - ${match.away_score ?? 0}` : 'VS'}
        </span>
        <span className="font-display flex-1 text-left text-sm font-semibold sm:text-base">{away}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
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
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {match.venue}
          </span>
        ) : null}
      </div>
    </Link>
  );
};

export default MatchCardShell;
