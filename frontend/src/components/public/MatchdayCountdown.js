import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, MapPin } from 'lucide-react';

const STATUS_LABEL = {
  LIVE: 'Sedang Berlangsung',
  POSTPONED: 'Ditunda',
  CANCELLED: 'Dibatalkan',
  FINISHED: 'Selesai',
};

/** Kick-off timestamp from real match data (WIB / UTC+7 — project convention). */
export const kickoffAt = (match) => {
  if (!match?.date) return null;
  const time = /^\d{2}:\d{2}/.test(match.time || '') ? match.time.slice(0, 5) : '00:00';
  const parsed = new Date(`${match.date}T${time}:00+07:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const pad = (n) => String(n).padStart(2, '0');

const Unit = ({ value, label, testId }) => (
  <div className="flex flex-col items-center" data-testid={testId}>
    <span
      className="font-display min-w-[52px] rounded-[var(--radius-sm)] px-2 py-2 text-center text-xl font-extrabold tabular-nums sm:min-w-[64px] sm:text-2xl"
      style={{ backgroundColor: 'rgba(254,254,254,0.08)', color: 'var(--club-primary)' }}
    >
      {value}
    </span>
    <span
      className="font-display mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em]"
      style={{ color: 'rgba(254,254,254,0.6)' }}
    >
      {label}
    </span>
  </div>
);

/**
 * Real-time countdown to the next ALSABBAT match. Uses only real match data;
 * never renders a negative countdown (falls back to MATCHDAY / match status).
 */
export const MatchdayCountdown = ({ match, clubName = 'ALSABBAT', compact = false }) => {
  const kickoff = useMemo(() => kickoffAt(match), [match]);
  const [now, setNow] = useState(() => Date.now());
  const statusLabel = STATUS_LABEL[match?.status];
  const remaining = kickoff ? kickoff.getTime() - now : -1;
  const running = !statusLabel && remaining > 0;

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  if (!match) return null;

  const isHome = match.venue_type !== 'AWAY';
  const home = isHome ? clubName : match.opponent?.name;
  const away = isHome ? match.opponent?.name : clubName;

  const seconds = Math.max(0, Math.floor(remaining / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return (
    <div
      className="relative overflow-hidden rounded-[var(--radius-lg)]"
      style={{ backgroundColor: '#000000', border: '1px solid rgba(252,207,43,0.22)' }}
      data-testid="matchday-countdown"
    >
      <div className="als-stadium-glow absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="als-pitch-lines absolute inset-0" aria-hidden="true" />
      <div className={`relative ${compact ? 'p-5' : 'p-6 sm:p-8'}`}>
        <p
          className="font-display text-[11px] font-semibold uppercase tracking-[0.26em]"
          style={{ color: 'var(--club-primary)' }}
        >
          Pertandingan Berikutnya
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="font-display text-lg font-bold sm:text-xl" style={{ color: 'var(--club-light)' }}>
            {home}
          </span>
          <span
            className="font-display text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: 'var(--club-primary)' }}
          >
            vs
          </span>
          <span className="font-display text-lg font-bold sm:text-xl" style={{ color: 'var(--club-light)' }}>
            {away}
          </span>
        </div>

        <div
          className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs sm:text-sm"
          style={{ color: 'rgba(254,254,254,0.72)' }}
        >
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {match.date}
          </span>
          {match.time ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {match.time} WIB
            </span>
          ) : null}
          {match.venue ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {match.venue}
            </span>
          ) : null}
        </div>

        <div className="mt-6" aria-live="polite">
          {statusLabel ? (
            <span
              className="font-display inline-block rounded-[var(--radius-sm)] px-4 py-2 text-sm font-bold uppercase tracking-[0.18em]"
              style={{ backgroundColor: 'rgba(252,207,43,0.16)', color: 'var(--club-primary)' }}
              data-testid="matchday-countdown-status"
            >
              {statusLabel}
            </span>
          ) : running ? (
            <div className="flex flex-wrap gap-3 sm:gap-4" data-testid="matchday-countdown-units">
              <Unit value={days} label="Hari" testId="countdown-days" />
              <Unit value={pad(hours)} label="Jam" testId="countdown-hours" />
              <Unit value={pad(minutes)} label="Menit" testId="countdown-minutes" />
              <Unit value={pad(secs)} label="Detik" testId="countdown-seconds" />
            </div>
          ) : (
            <span
              className="font-display inline-block rounded-[var(--radius-sm)] px-4 py-2 text-sm font-bold uppercase tracking-[0.18em]"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
              data-testid="matchday-countdown-matchday"
            >
              Hari Pertandingan
            </span>
          )}
        </div>

        <Link
          to={`/matches/${match.id}`}
          className="als-focus font-display mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-bold"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          data-testid="matchday-countdown-cta"
        >
          Pusat Pertandingan
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

export default MatchdayCountdown;
