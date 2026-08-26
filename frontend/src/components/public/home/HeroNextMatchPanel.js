import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ClubCrestMark } from '../../shared/ClubCrestMark';
import { OpponentCrest } from './OpponentCrest';
import { kickoffAt } from '../MatchdayCountdown';
import { useCountdown } from '../../../hooks/useCountdown';

const Unit = ({ value, label, testId }) => (
  <div className="min-w-[26px] text-center" data-testid={testId}>
    <p className="font-display text-[13px] font-extrabold leading-none tabular-nums" style={{ color: 'var(--club-light)' }}>
      {String(value).padStart(2, '0')}
    </p>
    <p className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.08em]" style={{ color: 'rgba(254,254,254,0.55)' }}>
      {label}
    </p>
  </div>
);

/** Compact floating glass Next Match card di dalam hero — foto banner tetap focal point. */
export const HeroNextMatchPanel = ({ match, clubName = 'ALSABBAT' }) => {
  const kickoff = kickoffAt(match);
  const { days, hours, minutes, seconds, running } = useCountdown(kickoff);
  if (!match) return null;

  return (
    <div
      className="w-full max-w-[300px] rounded-[var(--radius-md)] px-3 py-2.5 sm:max-w-[360px] sm:px-3.5 lg:w-[320px] lg:max-w-none"
      style={{
        backgroundColor: 'rgba(1,12,40,0.56)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(252,207,43,0.22)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.28)',
      }}
      data-testid="hero-next-match-panel"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[8px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(254,254,254,0.7)' }}>
          Pertandingan Berikutnya
        </p>
        <div className="flex shrink-0 items-center gap-1" aria-live="polite">
          <Unit value={running ? days : 0} label="Hari" testId="hero-countdown-days" />
          <Unit value={running ? hours : 0} label="Jam" testId="hero-countdown-hours" />
          <Unit value={running ? minutes : 0} label="Mnt" testId="hero-countdown-minutes" />
          <Unit value={running ? seconds : 0} label="Dtk" testId="hero-countdown-seconds" />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <ClubCrestMark size={26} onDark testId="hero-panel-club-crest" />
        <span
          className="font-display max-w-[74px] truncate text-[10px] font-bold uppercase tracking-wide"
          style={{ color: 'var(--club-light)' }}
        >
          {clubName}
        </span>
        <span className="font-display text-[10px] font-bold" style={{ color: 'var(--club-primary)' }}>
          VS
        </span>
        <OpponentCrest name={match.opponent?.name} logo={match.opponent?.logo} size={26} onDark />
        <span
          className="font-display min-w-0 flex-1 truncate text-[10px] font-bold uppercase tracking-wide"
          style={{ color: 'var(--club-light)' }}
        >
          {match.opponent?.name || 'Lawan'}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2" style={{ borderColor: 'rgba(254,254,254,0.12)' }}>
        <p className="min-w-0 flex-1 truncate text-[10px]" style={{ color: 'rgba(254,254,254,0.72)' }}>
          {[match.date, match.time ? `${match.time.slice(0, 5)} WIB` : null, match.venue].filter(Boolean).join(' · ')}
        </p>
        <Link
          to={`/matches/${match.id}`}
          className="als-focus font-display inline-flex min-h-[30px] shrink-0 items-center gap-1 rounded-full px-2.5 text-[10px] font-bold transition-transform duration-200 hover:-translate-y-px"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          data-testid="hero-next-match-cta"
        >
          Pusat Pertandingan
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};

export default HeroNextMatchPanel;
