import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ClubCrestMark } from '../../shared/ClubCrestMark';
import { OpponentCrest } from './OpponentCrest';
import { kickoffAt } from '../MatchdayCountdown';
import { useCountdown } from '../../../hooks/useCountdown';

const Unit = ({ value, label, testId }) => (
  <div className="min-w-[30px] text-center sm:min-w-[34px] lg:min-w-[38px]" data-testid={testId}>
    <p
      className="font-display text-lg font-extrabold leading-none tabular-nums sm:text-xl lg:text-2xl"
      style={{ color: 'var(--club-light)' }}
    >
      {String(value).padStart(2, '0')}
    </p>
    <p
      className="mt-1 text-[8px] font-bold uppercase tracking-[0.1em] sm:text-[9px] lg:text-[10px]"
      style={{ color: 'rgba(254,254,254,0.6)' }}
    >
      {label}
    </p>
  </div>
);

const Divider = () => (
  <span
    className="hidden h-9 w-px shrink-0 sm:inline-block lg:h-12"
    style={{ backgroundColor: 'rgba(254,254,254,0.16)' }}
    aria-hidden="true"
  />
);

/** Pecah nama venue jadi 2 baris seimbang tanpa mengubah/memotong teks. */
const splitVenue = (venue) => {
  const words = String(venue || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [words.join(' '), ''];
  let cut = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (diff < bestDiff) {
      bestDiff = diff;
      cut = i;
    }
  }
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
};

/**
 * Bar Next Match horizontal di BAWAH foto banner (tidak menutupi foto).
 * Isi diperbesar agar seimbang dengan tinggi panel. Logic countdown tidak diubah.
 */
export const HeroNextMatchPanel = ({ match, clubName = 'AL SABBAT' }) => {
  const kickoff = kickoffAt(match);
  const { days, hours, minutes, seconds, running } = useCountdown(kickoff);
  if (!match) return null;

  const schedule = [match.date, match.time ? `${match.time.slice(0, 5)} WIB` : null]
    .filter(Boolean)
    .join(' · ');
  const [venueLine1, venueLine2] = splitVenue(match.venue);

  return (
    <div
      className="flex w-full flex-wrap items-center gap-x-3 gap-y-3 sm:gap-x-3.5 lg:gap-x-4"
      data-testid="hero-next-match-panel"
    >
      <p
        className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] sm:text-[12px] lg:text-[13px]"
        style={{ color: 'var(--club-primary)' }}
      >
        Pertandingan Berikutnya
      </p>

      <Divider />

      <div className="flex min-w-0 shrink-0 items-center gap-2 lg:gap-2.5">
        <span className="lg:hidden">
          <ClubCrestMark size={34} onDark testId="hero-panel-club-crest-compact" />
        </span>
        <span className="hidden lg:inline-flex">
          <ClubCrestMark size={44} onDark testId="hero-panel-club-crest" />
        </span>
        <span
          className="font-display max-w-[104px] truncate text-sm font-bold uppercase tracking-wide lg:max-w-[150px] lg:text-base"
          style={{ color: 'var(--club-light)' }}
        >
          {clubName}
        </span>
        <span className="font-display text-sm font-bold lg:text-lg" style={{ color: 'var(--club-primary)' }}>
          VS
        </span>
        <span className="lg:hidden">
          <OpponentCrest name={match.opponent?.name} logo={match.opponent?.logo} size={34} onDark />
        </span>
        <span className="hidden lg:inline-flex">
          <OpponentCrest name={match.opponent?.name} logo={match.opponent?.logo} size={44} onDark />
        </span>
        <span
          className="font-display max-w-[112px] truncate text-sm font-bold uppercase tracking-wide lg:max-w-[160px] lg:text-base"
          style={{ color: 'var(--club-light)' }}
        >
          {match.opponent?.name || 'Lawan'}
        </span>
      </div>

      <Divider />

      <div className="flex shrink-0 items-center gap-1.5" aria-live="polite">
        <Unit value={running ? days : 0} label="Hari" testId="hero-countdown-days" />
        <Unit value={running ? hours : 0} label="Jam" testId="hero-countdown-hours" />
        <Unit value={running ? minutes : 0} label="Mnt" testId="hero-countdown-minutes" />
        <Unit value={running ? seconds : 0} label="Dtk" testId="hero-countdown-seconds" />
      </div>

      <Divider />

      <div
        className="min-w-0 flex-1 basis-[54%] text-xs leading-tight sm:basis-auto sm:text-[13px]"
        style={{ color: 'rgba(254,254,254,0.78)' }}
        data-testid="hero-next-match-meta"
      >
        {schedule ? (
          <span className="block" data-testid="hero-next-match-schedule">
            {schedule}
          </span>
        ) : null}
        {venueLine1 ? (
          <span className="mt-0.5 block font-semibold" data-testid="hero-next-match-venue-line-1">
            {venueLine1}
          </span>
        ) : null}
        {venueLine2 ? (
          <span className="block font-semibold" data-testid="hero-next-match-venue-line-2">
            {venueLine2}
          </span>
        ) : null}
      </div>

      <Link
        to={`/matches/${match.id}`}
        className="als-focus font-display ml-auto inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-full px-5 text-xs font-bold transition-transform duration-200 hover:-translate-y-px lg:min-h-[48px] lg:px-6 lg:text-[13px]"
        style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
        data-testid="hero-next-match-cta"
      >
        Pusat Pertandingan
        <ArrowRight className="h-4 w-4 lg:h-[18px] lg:w-[18px]" aria-hidden="true" />
      </Link>
    </div>
  );
};

export default HeroNextMatchPanel;
