import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin } from 'lucide-react';
import { ClubCrestMark } from '../../shared/ClubCrestMark';
import { OpponentCrest } from './OpponentCrest';

const formatDate = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

/** Editorial match card: upcoming fixture or finished result (real data only). */
export const UpcomingMatchCard = ({ match, clubName = 'ALSABBAT', competitionName, testId = 'home-upcoming-match' }) => {
  const hasScore = match.home_score !== null && match.home_score !== undefined;
  const isHome = match.venue_type !== 'AWAY';
  const clubGoals = hasScore ? (isHome ? match.home_score : match.away_score ?? 0) : null;
  const opponentGoals = hasScore ? (isHome ? match.away_score ?? 0 : match.home_score) : null;

  return (
    <article className="als-card als-lift p-6 sm:p-7" data-testid={testId}>
      <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--muted-fg)' }}>
        {competitionName || (hasScore ? 'Selesai' : 'Pertandingan Berikutnya')}
      </p>

      <div className="mt-6 flex items-start justify-center gap-5">
        <div className="flex w-[92px] flex-col items-center gap-2.5">
          <ClubCrestMark size={62} testId={`${testId}-club-crest`} />
          <span className="font-display text-center text-[11px] font-extrabold uppercase tracking-wide">{clubName}</span>
        </div>

        <span
          className="font-display mt-4 rounded-full px-3 py-1.5 text-lg font-extrabold tabular-nums"
          style={{ color: 'var(--club-secondary)', backgroundColor: 'rgba(1,40,145,0.06)' }}
        >
          {hasScore ? `${clubGoals} - ${opponentGoals}` : 'VS'}
        </span>

        <div className="flex w-[92px] flex-col items-center gap-2.5">
          <OpponentCrest name={match.opponent?.name} logo={match.opponent?.logo} size={62} />
          <span className="font-display line-clamp-2 text-center text-[11px] font-extrabold uppercase tracking-wide">
            {match.opponent?.name || 'Lawan'}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-1.5 text-center text-sm">
        <p className="flex items-center justify-center gap-2 font-semibold">
          <CalendarDays className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
          {formatDate(match.date) || 'Tanggal belum diatur'}
          {match.time ? ` · ${match.time} WIB` : ''}
        </p>
        {match.venue ? (
          <p className="flex items-center justify-center gap-2" style={{ color: 'var(--muted-fg)' }}>
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {match.venue}
          </p>
        ) : null}
      </div>

      <Link to={`/matches/${match.id}`} className="als-btn-gold als-focus mt-6 w-full justify-center" data-testid={`${testId}-cta`}>
        Detail Pertandingan
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
};

export default UpcomingMatchCard;
