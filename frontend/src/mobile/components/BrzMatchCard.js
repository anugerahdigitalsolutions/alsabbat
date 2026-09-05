import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useClub } from '../../context/ClubContext';
import { BrzCrest } from './BrzCrest';
import { useCompetitionName } from '../lib/useCompetitionName';
import {
  STATUS_LABEL,
  competitionLabel,
  formatDateShort,
  hasScore,
  isLive,
  matchSides,
  matchTime,
} from '../lib/matchUtils';

/**
 * Match card — two shapes taken from the UI reference:
 *  - variant="featured": the bright gradient "Top Event" hero card with the
 *    competition pill riding the top edge, crests either side, big score.
 *  - variant="row": the dark list card (crest · date + kick-off · crest).
 *
 * Every value comes from the existing /api/matches payload. Missing fields are
 * simply not rendered — nothing is invented.
 */

const Side = ({ side, onAccent, size = 46 }) => (
  <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
    {onAccent ? (
      <span
        style={{
          display: 'inline-flex',
          borderRadius: 999,
          backgroundColor: '#ffffff',
          padding: 3,
          boxShadow: '0 4px 12px rgba(8,18,46,0.18)',
        }}
      >
        <BrzCrest name={side.name} logo={side.logo} size={size} onLight />
      </span>
    ) : (
      <BrzCrest name={side.name} logo={side.logo} size={size} />
    )}
    <span
      className="brz-clamp-1 w-full text-center text-[12.5px] font-semibold leading-tight"
      style={{ color: onAccent ? 'var(--brz-on-accent)' : 'var(--brz-text)' }}
    >
      {side.name}
    </span>
  </div>
);

export const BrzMatchCard = ({ match, variant = 'row', testId }) => {
  const { club, shortName } = useClub();
  const resolvedCompetition = useCompetitionName(match.competition_id);
  const { home, away } = matchSides(match, club, shortName);
  const live = isLive(match);
  const scored = hasScore(match);
  const time = matchTime(match);
  const competition = resolvedCompetition || competitionLabel(match);
  const id = testId || `brz-match-${match.id}`;

  if (variant === 'featured') {
    return (
      <Link
        to={`/matches/${match.id}`}
        className="brz-card brz-card--accent block"
        style={{ paddingTop: 30 }}
        data-testid={id}
        aria-label={`Pertandingan ${home.name} vs ${away.name}`}
      >
        {/* competition / status pill riding the top edge */}
        <span
          className="absolute left-1/2 top-0 flex max-w-[78%] -translate-x-1/2 items-center gap-1.5 rounded-b-[14px] px-3.5 py-1.5"
          style={{ backgroundColor: 'var(--brz-surface-solid)' }}
        >
          {live ? (
            <span className="brz-live-dot" style={{ backgroundColor: 'var(--brz-live)' }} aria-hidden="true" />
          ) : null}
          <span
            className="brz-clamp-1 text-[11px] font-semibold"
            style={{ color: live ? 'var(--brz-live)' : 'var(--brz-text-muted)' }}
            data-testid={`${id}-competition`}
          >
            {live ? 'Live' : competition}
          </span>
        </span>

        <div className="flex items-start gap-2 px-4 pb-4 pt-3">
          <Side side={home} onAccent size={44} />
          <div className="flex w-[96px] flex-none flex-col items-center gap-1">
            <span
              className="text-[29px] font-bold leading-none tabular-nums"
              style={{ color: 'var(--brz-on-accent)', letterSpacing: '-0.03em' }}
              data-testid={`${id}-score`}
            >
              {scored ? `${match.home_score} - ${match.away_score ?? 0}` : time || 'VS'}
            </span>
            <span className="brz-clamp-1 text-[11px] font-semibold" style={{ color: 'rgba(8,18,46,0.66)' }}>
              {scored
                ? formatDateShort(match.date)
                : [formatDateShort(match.date), time ? 'WIB' : null].filter(Boolean).join(' · ')}
            </span>
          </div>
          <Side side={away} onAccent size={44} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/matches/${match.id}`}
      className="brz-card brz-card--pad block"
      data-testid={id}
      aria-label={`Pertandingan ${home.name} vs ${away.name}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="brz-clamp-1 text-[11px] font-semibold" style={{ color: 'var(--brz-text-muted)' }}>
          {competition}
        </span>
        {live ? (
          <span className="brz-live-badge" data-testid={`${id}-live`}>
            <span className="brz-live-dot" aria-hidden="true" />
            Live
          </span>
        ) : (
          <span className="brz-badge">{STATUS_LABEL[match.status] || match.status}</span>
        )}
      </div>

      <div className="flex items-start gap-2">
        <Side side={home} />
        <div className="flex w-[86px] flex-none flex-col items-center gap-0.5 pt-2">
          {scored ? (
            <span
              className="text-[26px] font-bold leading-none tabular-nums"
              style={{ letterSpacing: '-0.03em' }}
              data-testid={`${id}-score`}
            >
              {match.home_score}:{match.away_score ?? 0}
            </span>
          ) : (
            <>
              <span className="text-[11px] font-medium" style={{ color: 'var(--brz-text-muted)' }}>
                {formatDateShort(match.date) || 'TBD'}
              </span>
              <span
                className="text-[21px] font-bold leading-tight tabular-nums"
                data-testid={`${id}-kickoff`}
              >
                {time || '--:--'}
              </span>
            </>
          )}
        </div>
        <Side side={away} />
      </div>

      {match.venue ? (
        <div className="mt-3 flex items-center justify-center gap-1.5 border-t pt-3" style={{ borderColor: 'var(--brz-border)' }}>
          <MapPin size={12} style={{ color: 'var(--brz-text-dim)' }} aria-hidden="true" />
          <span className="brz-clamp-1 text-[11.5px]" style={{ color: 'var(--brz-text-muted)' }}>
            {match.venue}
          </span>
        </div>
      ) : null}
    </Link>
  );
};

export default BrzMatchCard;
