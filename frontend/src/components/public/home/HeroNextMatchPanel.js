import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ClubCrestMark } from '../../shared/ClubCrestMark';
import { OpponentCrest } from './OpponentCrest';
import { kickoffAt } from '../MatchdayCountdown';
import { useCountdown } from '../../../hooks/useCountdown';

const Unit = ({ value, label, testId }) => (
  <div className="min-w-[38px] text-center" data-testid={testId}>
    <p className="font-display text-base font-extrabold leading-none tabular-nums sm:text-lg" style={{ color: 'var(--club-light)' }}>
      {String(value).padStart(2, '0')}
    </p>
    <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em]" style={{ color: 'rgba(254,254,254,0.55)' }}>
      {label}
    </p>
  </div>
);

/** Floating glass Next Match panel inside the hero (real match data only). */
export const HeroNextMatchPanel = ({ match, clubName = 'ALSABBAT' }) => {
  const kickoff = kickoffAt(match);
  const { days, hours, minutes, seconds, running } = useCountdown(kickoff);
  if (!match) return null;

  return (
    <div className="als-glass w-full p-4 sm:p-5 lg:w-[430px]" data-testid="hero-next-match-panel">
      <p className="text-center text-[9px] font-bold uppercase tracking-[0.26em]" style={{ color: 'rgba(254,254,254,0.72)' }}>
        Pertandingan Berikutnya
      </p>

      <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center justify-center gap-4 sm:justify-start sm:gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <ClubCrestMark size={38} onDark testId="hero-panel-club-crest" />
            <span className="font-display text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--club-light)' }}>
              {clubName}
            </span>
          </div>
          <span className="font-display text-xs font-bold" style={{ color: 'var(--club-primary)' }}>
            VS
          </span>
          <div className="flex min-w-0 flex-col items-center gap-1.5">
            <OpponentCrest name={match.opponent?.name} logo={match.opponent?.logo} size={38} onDark />
            <span
              className="font-display max-w-[86px] truncate text-[10px] font-bold uppercase tracking-wide"
              style={{ color: 'var(--club-light)' }}
            >
              {match.opponent?.name || 'Lawan'}
            </span>
          </div>
        </div>

        <div
          className="grid grid-cols-4 gap-1.5 rounded-[var(--radius-md)] px-2 py-2 sm:gap-2"
          style={{ backgroundColor: 'rgba(254,254,254,0.10)' }}
          aria-live="polite"
        >
          <Unit value={running ? days : 0} label="Hari" testId="hero-countdown-days" />
          <Unit value={running ? hours : 0} label="Jam" testId="hero-countdown-hours" />
          <Unit value={running ? minutes : 0} label="Mnt" testId="hero-countdown-minutes" />
          <Unit value={running ? seconds : 0} label="Dtk" testId="hero-countdown-seconds" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3" style={{ borderColor: 'rgba(254,254,254,0.14)' }}>
        <p className="text-[11px]" style={{ color: 'rgba(254,254,254,0.75)' }}>
          {[match.date, match.time ? `${match.time} WIB` : null, match.venue].filter(Boolean).join(' · ')}
        </p>
        <Link
          to={`/matches/${match.id}`}
          className="als-focus font-display inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[11px] font-bold"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          data-testid="hero-next-match-cta"
        >
          Pusat Pertandingan
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};

export default HeroNextMatchPanel;
