import React, { useEffect, useMemo, useState } from 'react';
import { resolveMediaUrl } from './gallery/mediaUtils';
import { Link } from 'react-router-dom';
import { ArrowRight, Shirt } from 'lucide-react';

const POSITION_LABEL = {
  GOALKEEPER: 'Penjaga Gawang',
  DEFENDER: 'Belakang',
  MIDFIELDER: 'Tengah',
  FORWARD: 'Depan',
};

/**
 * Deterministic spotlight order (urutan yang sama dengan `pickSpotlightPlayer`).
 */
const spotlightOrder = (players = []) => {
  const active = players.filter((p) => !p.status || p.status === 'ACTIVE');
  const score = (p) => (p.photo ? 0 : 1) * 2 + (p.jersey_number === null || p.jersey_number === undefined ? 1 : 0);
  return [...active].sort(
    (a, b) =>
      score(a) - score(b) ||
      (a.jersey_number ?? 99) - (b.jersey_number ?? 99) ||
      String(a.id).localeCompare(String(b.id))
  );
};

export const pickSpotlightPlayer = (players = []) => spotlightOrder(players)[0] || null;

/**
 * Rotasi otomatis sorotan pemain: satu pemain per 10 detik, berulang.
 * Hanya satu pemain → tanpa timer. Timer di-reset saat pengunjung memilih titik
 * indikator, dan dibersihkan saat unmount.
 */
export const useRotatingSpotlight = (players = [], intervalMs = 10000) => {
  const ordered = useMemo(() => spotlightOrder(players), [players]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [ordered]);

  useEffect(() => {
    if (ordered.length < 2) return undefined;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % ordered.length), intervalMs);
    return () => clearTimeout(timer);
  }, [ordered, index, intervalMs]);

  const safeIndex = ordered.length ? index % ordered.length : 0;
  return {
    player: ordered[safeIndex] || null,
    total: ordered.length,
    index: safeIndex,
    select: setIndex,
  };
};

/** Titik indikator sorotan — kecil, gold aktif, klik untuk pindah pemain. */
export const SpotlightDots = ({ total, index, onSelect, testId = 'spotlight-dots' }) => {
  if (!total || total < 2) return null;
  return (
    <div className="mt-3 flex items-center justify-center gap-2" data-testid={testId}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i === index;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Tampilkan sorotan pemain ${i + 1}`}
            aria-current={active}
            className="als-focus rounded-full transition-all duration-200"
            style={{
              width: active ? 22 : 8,
              height: 8,
              backgroundColor: active ? 'var(--club-primary)' : 'rgba(1,40,145,0.25)',
            }}
            data-testid={`${testId}-${i}`}
          />
        );
      })}
    </div>
  );
};

export const PlayerSpotlight = ({ player }) => {
  if (!player) return null;
  const name = player.display_name || player.full_name;

  return (
    <article
      className="als-lift relative grid overflow-hidden rounded-[var(--radius-lg)] lg:grid-cols-[minmax(0,320px)_1fr]"
      style={{ backgroundColor: '#000000', border: '1px solid rgba(252,207,43,0.22)' }}
      data-testid="player-spotlight"
    >
      <div className="als-zoom relative h-72 lg:h-full lg:min-h-[320px]">
        {player.photo ? (
          <img
            src={resolveMediaUrl(player.photo)}
            alt={name}
            className="h-full w-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <>
            <div className="als-stadium-glow absolute inset-0 opacity-70" aria-hidden="true" />
            <span
              className="als-jersey-ghost absolute inset-0 flex items-center justify-center text-[7rem]"
              aria-hidden="true"
            >
              {player.jersey_number ?? ''}
            </span>
            {player.jersey_number === null || player.jersey_number === undefined ? (
              <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <Shirt className="h-14 w-14" style={{ color: 'rgba(252,207,43,0.5)' }} />
              </span>
            ) : null}
          </>
        )}
      </div>

      <div className="relative flex flex-col justify-center p-6 sm:p-8">
        <div className="als-pitch-lines absolute inset-0" aria-hidden="true" />
        <div className="relative">
          <p
            className="font-display text-[11px] font-semibold uppercase tracking-[0.26em]"
            style={{ color: 'var(--club-primary)' }}
          >
            Sorotan Pemain
          </p>
          <h3
            className="font-display mt-3 text-2xl font-bold leading-tight sm:text-3xl"
            style={{ color: 'var(--club-light)' }}
          >
            {name}
          </h3>
          <span className="als-gold-rule mt-4" aria-hidden="true" />

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: 'rgba(254,254,254,0.78)' }}>
            <span className="font-display text-2xl font-extrabold" style={{ color: 'var(--club-primary)' }}>
              #{player.jersey_number ?? '-'}
            </span>
            {player.position ? (
              <span className="font-display font-semibold uppercase tracking-[0.16em]">
                {POSITION_LABEL[player.position] || player.position}
              </span>
            ) : null}
            {player.nationality ? <span>{player.nationality}</span> : null}
          </div>

          <Link
            to={`/players/${player.id}`}
            className="als-focus font-display mt-7 inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-bold"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            data-testid="player-spotlight-cta"
          >
            Lihat Profil
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default PlayerSpotlight;
