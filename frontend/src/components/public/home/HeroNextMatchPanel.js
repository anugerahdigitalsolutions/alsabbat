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

const Divider = () => (
  <span
    className="hidden h-5 w-px shrink-0 sm:inline-block"
    style={{ backgroundColor: 'rgba(254,254,254,0.16)' }}
    aria-hidden="true"
  />
);

/**
 * Bar Next Match horizontal di BAWAH foto banner (tidak menutupi foto).
 * Compact, tinggi sejajar area kontrol slider. Logic countdown tidak diubah.
 */
export const HeroNextMatchPanel = ({ match, clubName = 'AL SABBAT' }) => {
  const kickoff = kickoffAt(match);
  const { days, hours, minutes, seconds, running } = useCountdown(kickoff);
  if (!match) return null;

  const meta = [match.date, match.time ? `${match.time.slice(0, 5)} WIB` : null, match.venue]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2" data-testid="hero-next-match-panel">
      <p
        className="shrink-0 text-[9px] font-bold uppercase tracking-[0.16em]"
        style={{ color: 'var(--club-primary)' }}
      >
        Pertandingan Berikutnya
      </p>

      <Divider />

      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <ClubCrestMark size={24} onDark testId="hero-panel-club-crest" />
        <span
          className="font-display max-w-[104px] truncate text-[11px] font-bold uppercase tracking-wide"
          style={{ color: 'var(--club-light)' }}
        >
          {clubName}
        </span>
        <span className="font-display text-[10px] font-bold" style={{ color: 'var(--club-primary)' }}>
          VS
        </span>
        <OpponentCrest name={match.opponent?.name} logo={match.opponent?.logo} size={24} onDark />
        <span
          className="font-display max-w-[120px] truncate text-[11px] font-bold uppercase tracking-wide"
          style={{ color: 'var(--club-light)' }}
        >
          {match.opponent?.name || 'Lawan'}
        </span>
      </div>

      <Divider />

      <div className="flex shrink-0 items-center gap-1" aria-live="polite">
        <Unit value={running ? days : 0} label="Hari" testId="hero-countdown-days" />
        <Unit value={running ? hours : 0} label="Jam" testId="hero-countdown-hours" />
        <Unit value={running ? minutes : 0} label="Mnt" testId="hero-countdown-minutes" />
        <Unit value={running ? seconds : 0} label="Dtk" testId="hero-countdown-seconds" />
      </div>

      <Divider />

      <p
        className="min-w-0 flex-1 basis-[54%] truncate text-[10px] sm:basis-auto sm:text-[11px]"
        style={{ color: 'rgba(254,254,254,0.72)' }}
      >
        {meta}
      </p>

      <Link
        to={`/matches/${match.id}`}
        className="als-focus font-display ml-auto inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-full px-3 text-[10px] font-bold transition-transform duration-200 hover:-translate-y-px"
        style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
        data-testid="hero-next-match-cta"
      >
        Pusat Pertandingan
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </div>
  );
};

export default HeroNextMatchPanel;
