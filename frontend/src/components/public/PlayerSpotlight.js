import React from 'react';
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
 * Deterministic spotlight pick: a player with a photo & jersey number first,
 * otherwise the lowest jersey number. No randomness, no fabricated data.
 */
export const pickSpotlightPlayer = (players = []) => {
  const active = players.filter((p) => !p.status || p.status === 'ACTIVE');
  if (!active.length) return null;
  const score = (p) => (p.photo ? 0 : 1) * 2 + (p.jersey_number === null || p.jersey_number === undefined ? 1 : 0);
  return [...active].sort(
    (a, b) =>
      score(a) - score(b) ||
      (a.jersey_number ?? 99) - (b.jersey_number ?? 99) ||
      String(a.id).localeCompare(String(b.id))
  )[0];
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
